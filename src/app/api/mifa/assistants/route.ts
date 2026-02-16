import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrSeedAssistants } from "@/lib/mifa/assistants";
import { DEFAULT_GAUGES, validateGauges } from "@/lib/mifa/xp-levels";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const assistants = await getOrSeedAssistants(user.id);
  return NextResponse.json({ assistants });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { name, avatar, avatar_type, system_prompt, purpose, color, gauges } = body;

  if (!name?.trim() || !system_prompt?.trim()) {
    return NextResponse.json({ error: "Nom et instructions requis" }, { status: 400 });
  }

  if (name.length > 50) {
    return NextResponse.json({ error: "Nom trop long (50 caractères max)" }, { status: 400 });
  }

  if (system_prompt.length > 2000) {
    return NextResponse.json({ error: "Instructions trop longues (2000 caractères max)" }, { status: 400 });
  }

  // Validate gauges if provided
  let validatedGauges = DEFAULT_GAUGES;
  if (gauges) {
    const parsed = validateGauges(gauges);
    if (!parsed) {
      return NextResponse.json({ error: "Gauges invalides (chaque valeur doit être entre 1 et 5)" }, { status: 400 });
    }
    validatedGauges = parsed;
  }

  const adminClient = createAdminClient();

  // Count existing assistants (limit to 20)
  const { count } = await adminClient
    .from("custom_assistants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count || 0) >= 20) {
    return NextResponse.json({ error: "Maximum 20 mifas" }, { status: 400 });
  }

  const { data: assistant, error } = await adminClient
    .from("custom_assistants")
    .insert({
      user_id: user.id,
      name: name.trim(),
      avatar: avatar || "🤖",
      avatar_type: avatar_type === "generated" ? "generated" : "emoji",
      system_prompt: system_prompt.trim(),
      purpose: purpose?.trim() || null,
      color: color || "blue",
      is_preset: false,
      sort_order: (count || 0) + 1,
      gauges: validatedGauges,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Erreur de création" }, { status: 500 });
  }

  return NextResponse.json({ assistant });
}
