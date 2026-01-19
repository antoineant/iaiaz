import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClassModelRestrictions } from "@/lib/org";

export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get all active models
    const { data: allModels } = await adminClient
      .from("ai_models")
      .select("id, name, provider, description, category, is_recommended, capabilities")
      .eq("is_active", true)
      .order("provider")
      .order("name");

    if (!allModels) {
      return NextResponse.json({ models: [], restrictions: null });
    }

    // Get user's class restrictions
    const restrictions = await getClassModelRestrictions(user.id);

    // Filter models if restrictions exist
    let filteredModels = allModels;
    if (restrictions.allowedModels !== null) {
      filteredModels = allModels.filter((m) =>
        restrictions.allowedModels!.includes(m.id)
      );
    }

    return NextResponse.json({
      models: filteredModels,
      restrictions: {
        hasClass: restrictions.hasClass,
        className: restrictions.className,
        restricted: restrictions.allowedModels !== null,
      },
    });
  } catch (error) {
    console.error("Error fetching allowed models:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des modèles" },
      { status: 500 }
    );
  }
}
