import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// DELETE /api/create/images/[id] - Delete an image generation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { id } = await params;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Check if the generation belongs to the user
    const { data: generation, error: fetchError } = await supabase
      .from("image_generations")
      .select("id, user_id, image_url")
      .eq("id", id)
      .single();

    if (fetchError || !generation) {
      return NextResponse.json(
        { error: "Image non trouvée" },
        { status: 404 }
      );
    }

    if (generation.user_id !== user.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Delete the generation record
    const { error: deleteError } = await adminClient
      .from("image_generations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting generation:", deleteError);
      return NextResponse.json(
        { error: "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete image API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
