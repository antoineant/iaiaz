import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/student/classes/[classId] - Get single class info for student
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get class info and membership
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select(`
        id,
        credit_allocated,
        credit_used,
        status,
        created_at,
        organization_classes!inner (
          id,
          name,
          description,
          status,
          starts_at,
          ends_at,
          closed_at,
          join_code,
          settings,
          organizations!inner (
            id,
            name,
            status
          )
        )
      `)
      .eq("user_id", user.id)
      .eq("class_id", classId)
      .eq("role", "student")
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Class not found or not a member" },
        { status: 404 }
      );
    }

    // Type assertion for nested data
    const classData = membership.organization_classes as unknown as {
      id: string;
      name: string;
      description: string | null;
      status: string;
      starts_at: string | null;
      ends_at: string | null;
      closed_at: string | null;
      join_code: string;
      settings: Record<string, unknown>;
      organizations: {
        id: string;
        name: string;
        status: string;
      };
    };

    // Check if class is accessible
    const now = new Date();
    const isAccessible =
      classData.status === "active" &&
      classData.closed_at === null &&
      (classData.starts_at === null || new Date(classData.starts_at) <= now) &&
      (classData.ends_at === null || new Date(classData.ends_at) > now) &&
      classData.organizations.status === "active";

    // Determine access message
    let accessMessage = null;
    if (!isAccessible) {
      if (classData.status !== "active") {
        accessMessage = "class_not_active";
      } else if (classData.closed_at !== null) {
        accessMessage = "session_closed";
      } else if (classData.starts_at && new Date(classData.starts_at) > now) {
        accessMessage = "session_not_started";
      } else if (classData.ends_at && new Date(classData.ends_at) <= now) {
        accessMessage = "session_expired";
      } else if (classData.organizations.status !== "active") {
        accessMessage = "organization_not_active";
      }
    }

    return NextResponse.json({
      membership_id: membership.id,
      class_id: classData.id,
      class_name: classData.name,
      class_description: classData.description,
      organization_id: classData.organizations.id,
      organization_name: classData.organizations.name,
      status: classData.status,
      is_accessible: isAccessible,
      access_message: accessMessage,
      credits_allocated: membership.credit_allocated,
      credits_used: membership.credit_used,
      credits_remaining: (membership.credit_allocated || 0) - (membership.credit_used || 0),
      joined_at: membership.created_at,
      member_status: membership.status,
      class_starts_at: classData.starts_at,
      class_ends_at: classData.ends_at,
      class_closed_at: classData.closed_at,
    });
  } catch (error) {
    console.error("Student class info error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
