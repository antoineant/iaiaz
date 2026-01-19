import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageClass } from "@/lib/org";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/org/classes/[id]/close - Close class session immediately
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

    // Set closed_at to now
    const { data: classData, error } = await supabase
      .from("organization_classes")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "active")
      .select()
      .single();

    if (error) {
      console.error("Error closing class:", error);
      return NextResponse.json(
        { error: "Failed to close class session" },
        { status: 500 }
      );
    }

    if (!classData) {
      return NextResponse.json(
        { error: "Class not found or already closed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      class: classData,
      message: "Session closed successfully",
    });
  } catch (error) {
    console.error("Class close error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
