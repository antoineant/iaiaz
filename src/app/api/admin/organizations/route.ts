import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

// GET - List all organizations with credit info
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from("organizations")
    .select(
      "id, name, owner_id, credit_balance, credit_allocated, type, created_at, updated_at",
      { count: "exact" }
    );

  // Filter by search term (name)
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  // Pagination
  query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get owner emails
  const ownerIds = data?.map((o) => o.owner_id).filter(Boolean) || [];
  let ownerEmails: Record<string, string> = {};

  if (ownerIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, email")
      .in("id", ownerIds);

    if (profiles) {
      ownerEmails = profiles.reduce((acc, p) => {
        acc[p.id] = p.email;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Get member counts for each organization
  const orgIds = data?.map((o) => o.id) || [];
  let memberCounts: Record<string, number> = {};

  if (orgIds.length > 0) {
    const { data: members } = await supabase
      .from("organization_members")
      .select("organization_id")
      .in("organization_id", orgIds)
      .eq("status", "active");

    if (members) {
      memberCounts = members.reduce((acc, m) => {
        acc[m.organization_id] = (acc[m.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  // Combine data
  const organizationsWithInfo = data?.map((org) => ({
    ...org,
    owner_email: ownerEmails[org.owner_id] || null,
    member_count: memberCounts[org.id] || 0,
    available_credits: (org.credit_balance || 0) - (org.credit_allocated || 0),
  }));

  return NextResponse.json({
    organizations: organizationsWithInfo,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
