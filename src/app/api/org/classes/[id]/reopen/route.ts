import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageClass } from "@/lib/org";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/org/classes/[id]/reopen - Reopen a closed class session
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Clear closed_at
    const { data: classData, error } = await supabase
      .from("organization_classes")
      .update({ closed_at: null })
      .eq("id", id)
      .eq("status", "active")
      .select()
      .single();

    if (error) {
      console.error("Error reopening class:", error);
      return NextResponse.json(
        { error: "Failed to reopen class session" },
        { status: 500 }
      );
    }

    if (!classData) {
      return NextResponse.json(
        { error: "Class not found or not active" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      class: classData,
      message: "Session reopened successfully",
    });
  } catch (error) {
    console.error("Class reopen error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
