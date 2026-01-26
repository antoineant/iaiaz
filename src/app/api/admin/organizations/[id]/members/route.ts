import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/organizations/[id]/members - List organization members
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orgId } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  try {
    // Get organization info
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, type")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get members
    const { data: members, error: membersError } = await adminClient
      .from("organization_members")
      .select(`
        id,
        user_id,
        role,
        can_manage_credits,
        credit_allocated,
        credit_used,
        status,
        created_at
      `)
      .eq("organization_id", orgId)
      .order("role", { ascending: true })
      .order("created_at", { ascending: false });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    // Get user emails
    const userIds = members?.map((m) => m.user_id) || [];
    let userEmails: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds);

      if (profiles) {
        userEmails = profiles.reduce((acc, p) => {
          acc[p.id] = p.email || p.display_name || "Unknown";
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Combine data
    const membersWithInfo = members?.map((member) => ({
      ...member,
      email: userEmails[member.user_id] || "Unknown",
    }));

    return NextResponse.json({
      organization: org,
      members: membersWithInfo || [],
    });
  } catch (error) {
    console.error("Admin members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/organizations/[id]/members - Update member permissions
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orgId } = await params;
  const adminClient = createAdminClient();

  try {
    const body = await request.json();
    const { member_id, can_manage_credits } = body;

    if (!member_id) {
      return NextResponse.json(
        { error: "member_id is required" },
        { status: 400 }
      );
    }

    if (typeof can_manage_credits !== "boolean") {
      return NextResponse.json(
        { error: "can_manage_credits must be a boolean" },
        { status: 400 }
      );
    }

    // Verify member belongs to this organization
    const { data: member, error: memberError } = await adminClient
      .from("organization_members")
      .select("id, role, organization_id")
      .eq("id", member_id)
      .eq("organization_id", orgId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Member not found in this organization" },
        { status: 404 }
      );
    }

    // Don't allow removing permission from owners/admins (they always have it)
    if (member.role === "owner" || member.role === "admin") {
      if (!can_manage_credits) {
        return NextResponse.json(
          { error: "Cannot remove credit management permission from owners/admins" },
          { status: 400 }
        );
      }
      // Permission is already true for owners/admins, no need to update
      return NextResponse.json({ success: true, can_manage_credits: true });
    }

    // Update permission
    const { error: updateError } = await adminClient
      .from("organization_members")
      .update({
        can_manage_credits,
        updated_at: new Date().toISOString(),
      })
      .eq("id", member_id);

    if (updateError) {
      console.error("Error updating member:", updateError);
      return NextResponse.json(
        { error: "Failed to update member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, can_manage_credits });
  } catch (error) {
    console.error("Admin member update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
