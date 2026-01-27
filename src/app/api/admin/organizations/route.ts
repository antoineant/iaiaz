import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

// GET - List all organizations with credit info
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  // Build query - use adminClient to bypass RLS
  let query = adminClient
    .from("organizations")
    .select(
      "id, name, credit_balance, credit_allocated, type, created_at, updated_at",
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

  const orgIds = data?.map((o) => o.id) || [];

  // Get owners (members with role = 'owner') and their emails
  let ownerEmails: Record<string, string> = {};
  let memberCounts: Record<string, number> = {};

  if (orgIds.length > 0) {
    // Get all members for these orgs
    const { data: members } = await adminClient
      .from("organization_members")
      .select("organization_id, user_id, role")
      .in("organization_id", orgIds)
      .eq("status", "active");

    if (members) {
      // Count members per org
      memberCounts = members.reduce((acc, m) => {
        acc[m.organization_id] = (acc[m.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get owner user IDs
      const ownersByOrg: Record<string, string> = {};
      members.forEach((m) => {
        if (m.role === "owner") {
          ownersByOrg[m.organization_id] = m.user_id;
        }
      });

      // Get owner emails from profiles
      const ownerUserIds = Object.values(ownersByOrg).filter(Boolean);
      if (ownerUserIds.length > 0) {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id, email")
          .in("id", ownerUserIds);

        if (profiles) {
          const userIdToEmail: Record<string, string> = {};
          profiles.forEach((p) => {
            userIdToEmail[p.id] = p.email;
          });

          // Map org_id -> owner email
          Object.entries(ownersByOrg).forEach(([orgId, userId]) => {
            if (userIdToEmail[userId]) {
              ownerEmails[orgId] = userIdToEmail[userId];
            }
          });
        }
      }
    }
  }

  // Combine data
  const organizationsWithInfo = data?.map((org) => ({
    ...org,
    owner_email: ownerEmails[org.id] || null,
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
