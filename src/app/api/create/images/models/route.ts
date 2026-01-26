import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/create/images/models - List available image models
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Fetch active image models
    const { data: models, error } = await supabase
      .from("image_models")
      .select("*")
      .eq("is_active", true)
      .order("is_recommended", { ascending: false })
      .order("name");

    if (error) {
      console.error("Error fetching image models:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des modèles" },
        { status: 500 }
      );
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Image models API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
