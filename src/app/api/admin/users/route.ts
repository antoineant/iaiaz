import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

// GET - List all users with their profiles and auth data
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const accountType = searchParams.get("accountType") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, account_type, is_admin, credits_balance, created_at, updated_at", { count: "exact" });

  // Filter by search term (email or display_name)
  if (search) {
    query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  }

  // Filter by account type
  if (accountType) {
    query = query.eq("account_type", accountType);
  }

  // Pagination
  query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get auth data for all users (email confirmation status)
  const userIds = data?.map((u) => u.id) || [];
  let authDataMap: Record<string, { email_confirmed_at: string | null; last_sign_in_at: string | null }> = {};

  if (userIds.length > 0) {
    // Fetch auth users in batches (Supabase admin API)
    const { data: authUsers } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Get all users for simplicity
    });

    if (authUsers?.users) {
      authDataMap = authUsers.users.reduce((acc, u) => {
        acc[u.id] = {
          email_confirmed_at: u.email_confirmed_at || null,
          last_sign_in_at: u.last_sign_in_at || null,
        };
        return acc;
      }, {} as Record<string, { email_confirmed_at: string | null; last_sign_in_at: string | null }>);
    }
  }

  // Get last activity for users (from messages table)
  let lastActivityMap: Record<string, string> = {};
  if (userIds.length > 0) {
    // Get user_ids from conversations and find latest message
    const { data: conversations } = await adminClient
      .from("conversations")
      .select("id, user_id, updated_at")
      .in("user_id", userIds)
      .order("updated_at", { ascending: false });

    if (conversations) {
      // Get the most recent activity per user
      lastActivityMap = conversations.reduce((acc, c) => {
        if (c.user_id && !acc[c.user_id]) {
          acc[c.user_id] = c.updated_at;
        }
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Combine data
  const usersWithAuth = data?.map((user) => ({
    ...user,
    email_confirmed_at: authDataMap[user.id]?.email_confirmed_at || null,
    last_sign_in_at: authDataMap[user.id]?.last_sign_in_at || null,
    last_activity: lastActivityMap[user.id] || null,
  }));

  return NextResponse.json({
    users: usersWithAuth,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
