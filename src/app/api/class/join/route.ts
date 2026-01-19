import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/class/join?token=xxx - Get class info by join token (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Use the RPC function to get class info
    const { data: result, error } = await supabase.rpc("get_class_by_token", {
      p_token: token,
    });

    if (error) {
      console.error("Error fetching class by token:", error);
      return NextResponse.json(
        { error: "Failed to fetch class" },
        { status: 500 }
      );
    }

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || "Class not found" },
        { status: 404 }
      );
    }

    // Check if user is already logged in and already a member
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let membershipStatus = null;
    if (user) {
      const classId = result.class?.id;
      if (classId) {
        const { data: existingMember } = await supabase
          .from("organization_members")
          .select("id, status, class_id")
          .eq("user_id", user.id)
          .eq("organization_id", result.organization?.id)
          .single();

        if (existingMember) {
          membershipStatus = {
            is_member: true,
            member_id: existingMember.id,
            status: existingMember.status,
            same_class: existingMember.class_id === classId,
          };
        }
      }
    }

    return NextResponse.json({
      ...result,
      is_logged_in: !!user,
      membership: membershipStatus,
    });
  } catch (error) {
    console.error("Class lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/class/join - Join a class (authenticated user)
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { token, display_name } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Use the RPC function to join class
    const { data: result, error } = await supabase.rpc("join_class", {
      p_token: token,
      p_user_id: user.id,
      p_display_name: display_name || null,
    });

    if (error) {
      console.error("Error joining class:", error);
      return NextResponse.json(
        { error: "Failed to join class" },
        { status: 500 }
      );
    }

    if (!result || !result.success) {
      const errorMessages: Record<string, string> = {
        class_not_found: "Class not found",
        class_not_active: "This class is no longer active",
        session_closed: "The session has been closed by the trainer",
        session_not_started: "The session has not started yet",
        session_expired: "The session has expired",
        organization_not_active: "The organization is not active",
      };

      return NextResponse.json(
        {
          error: errorMessages[result?.error] || result?.error || "Failed to join class",
          code: result?.error,
          starts_at: result?.starts_at,
          ended_at: result?.ended_at,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      member_id: result.member_id,
      already_member: result.already_member,
      credit_allocated: result.credit_allocated,
      class_id: result.class_id,
      organization_id: result.organization_id,
    });
  } catch (error) {
    console.error("Class join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
