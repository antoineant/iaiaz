import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/create/videos/[id] - Delete a video generation
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Verify ownership and delete
    const { error } = await supabase
      .from("video_generations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting video generation:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Video delete API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// GET /api/create/videos/[id] - Get a specific video generation
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: generation, error } = await supabase
      .from("video_generations")
      .select(`
        *,
        model:video_models(id, name, provider)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !generation) {
      return NextResponse.json(
        { error: "Vidéo non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json({ generation });
  } catch (error) {
    console.error("Video get API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
