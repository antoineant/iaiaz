import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// GET - List all users with their profiles
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
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

  return NextResponse.json({
    users: data,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
