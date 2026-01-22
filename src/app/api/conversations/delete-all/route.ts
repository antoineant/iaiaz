import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/conversations/delete-all
 * Deletes all conversations and messages for the authenticated user.
 * Messages are automatically deleted via CASCADE when conversations are deleted.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all conversations for this user
    // Messages are automatically deleted via ON DELETE CASCADE
    const { data, error } = await supabase
      .from("conversations")
      .delete()
      .eq("user_id", user.id)
      .select("id");

    if (error) {
      console.error("Error deleting conversations:", error);
      return NextResponse.json(
        { error: "Failed to delete conversations" },
        { status: 500 }
      );
    }

    const deletedCount = data?.length || 0;

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
    });
  } catch (error) {
    console.error("Delete all conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
