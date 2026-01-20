import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/org";

// GET /api/org/members - List all members for the organization
export async function GET(request: NextRequest) {
  try {
    const membership = await requireOrgRole(["owner", "admin", "teacher"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized - must be an admin or teacher" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Optional filters
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const classId = searchParams.get("class_id");

    let query = supabase
      .from("organization_members")
      .select(`
        id,
        user_id,
        role,
        status,
        credit_allocated,
        credit_used,
        display_name,
        class_name,
        student_id,
        class_id,
        created_at,
        updated_at,
        profiles!inner (
          id,
          email,
          display_name,
          avatar_url
        )
      `)
      .eq("organization_id", membership.organizationId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (role) {
      query = query.eq("role", role);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data: members, error } = await query;

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    // Transform the data to flatten profiles
    const transformedMembers = members?.map((m) => {
      const profile = m.profiles as unknown as { id: string; email: string; display_name: string | null; avatar_url: string | null } | null;
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        credit_allocated: m.credit_allocated,
        credit_used: m.credit_used,
        credit_remaining: (m.credit_allocated || 0) - (m.credit_used || 0),
        display_name: m.display_name || profile?.display_name,
        class_name: m.class_name,
        student_id: m.student_id,
        class_id: m.class_id,
        email: profile?.email,
        avatar_url: profile?.avatar_url,
        created_at: m.created_at,
        updated_at: m.updated_at,
      };
    });

    return NextResponse.json(transformedMembers);
  } catch (error) {
    console.error("Members fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
