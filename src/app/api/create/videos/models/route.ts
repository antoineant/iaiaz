import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/create/videos/models - Get available video models
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: models, error } = await supabase
      .from("video_models")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching video models:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des modèles" },
        { status: 500 }
      );
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Video models API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
