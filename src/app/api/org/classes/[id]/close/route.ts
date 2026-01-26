import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const adminClient = createAdminClient();

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

    // Refund unused credits to organization pool
    const { data: refundResult, error: refundError } = await adminClient.rpc(
      "refund_class_credits",
      { p_class_id: id }
    );

    if (refundError) {
      console.error("Error refunding credits:", refundError);
      // Don't fail the close operation, just log the error
    }

    return NextResponse.json({
      success: true,
      class: classData,
      message: "Session closed successfully",
      refund: refundResult || null,
    });
  } catch (error) {
    console.error("Class close error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
