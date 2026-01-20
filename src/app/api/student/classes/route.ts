import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface StudentClass {
  membership_id: string;
  class_id: string;
  class_name: string;
  class_description: string | null;
  organization_id: string;
  organization_name: string;
  status: "active" | "archived" | "closed";
  is_accessible: boolean;
  credits_allocated: number;
  credits_used: number;
  credits_remaining: number;
  joined_at: string;
  class_starts_at: string | null;
  class_ends_at: string | null;
  class_closed_at: string | null;
  member_status: "active" | "suspended" | "removed";
}

// GET /api/student/classes - Get student's class history
export async function GET() {
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

    // Use the RPC function to get student's classes
    const { data: classes, error } = await supabase.rpc("get_student_classes", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error fetching student classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 }
      );
    }

    // Separate active and past classes
    const allClasses = (classes || []) as StudentClass[];
    const activeClasses = allClasses.filter((c) => c.is_accessible && c.member_status === "active");
    const pastClasses = allClasses.filter((c) => !c.is_accessible || c.member_status !== "active");

    // Calculate stats
    const stats = {
      total_joined: allClasses.length,
      active_classes: activeClasses.length,
      total_credits_used: allClasses.reduce((sum, c) => sum + (c.credits_used || 0), 0),
      total_credits_allocated: allClasses.reduce((sum, c) => sum + (c.credits_allocated || 0), 0),
    };

    return NextResponse.json({
      classes: allClasses,
      active_classes: activeClasses,
      past_classes: pastClasses,
      stats,
    });
  } catch (error) {
    console.error("Student classes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
