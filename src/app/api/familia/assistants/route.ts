import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PRESET_ASSISTANTS = [
  {
    name: "Aide aux devoirs",
    avatar: "🎓",
    system_prompt: "Tu es un tuteur patient. Aide l'élève à comprendre étape par étape. Ne donne jamais la réponse directement.",
    purpose: "Accompagnement scolaire",
    color: "blue",
    sort_order: 0,
  },
  {
    name: "Coach écriture",
    avatar: "✍️",
    system_prompt: "Tu es un coach d'écriture. Aide à structurer les idées, améliorer les arguments, renforcer le style.",
    purpose: "Rédaction et expression écrite",
    color: "purple",
    sort_order: 1,
  },
  {
    name: "Maths",
    avatar: "🧮",
    system_prompt: "Tu es un prof de maths sympa. Décompose les problèmes en étapes simples. Utilise des analogies.",
    purpose: "Mathématiques",
    color: "green",
    sort_order: 2,
  },
  {
    name: "Créatif",
    avatar: "🎨",
    system_prompt: "Tu es un assistant créatif. Aide à trouver des idées originales, écrire des histoires, imaginer des projets.",
    purpose: "Créativité et imagination",
    color: "orange",
    sort_order: 3,
  },
  {
    name: "Culture G",
    avatar: "🌍",
    system_prompt: "Tu es un compagnon de révision. Explique clairement, donne des exemples, adapte-toi au niveau.",
    purpose: "Culture générale et révisions",
    color: "teal",
    sort_order: 4,
  },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Check if user has any assistants
  const { data: existing, count } = await adminClient
    .from("custom_assistants")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  // Seed presets on first call
  if (count === 0) {
    const presets = PRESET_ASSISTANTS.map((p) => ({
      ...p,
      user_id: user.id,
      is_preset: true,
    }));

    const { data: seeded } = await adminClient
      .from("custom_assistants")
      .insert(presets)
      .select();

    return NextResponse.json({ assistants: seeded || [] });
  }

  return NextResponse.json({ assistants: existing || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { name, avatar, system_prompt, purpose, color } = body;

  if (!name?.trim() || !system_prompt?.trim()) {
    return NextResponse.json({ error: "Nom et instructions requis" }, { status: 400 });
  }

  if (name.length > 50) {
    return NextResponse.json({ error: "Nom trop long (50 caractères max)" }, { status: 400 });
  }

  if (system_prompt.length > 2000) {
    return NextResponse.json({ error: "Instructions trop longues (2000 caractères max)" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Count existing assistants (limit to 20)
  const { count } = await adminClient
    .from("custom_assistants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count || 0) >= 20) {
    return NextResponse.json({ error: "Maximum 20 assistants" }, { status: 400 });
  }

  const { data: assistant, error } = await adminClient
    .from("custom_assistants")
    .insert({
      user_id: user.id,
      name: name.trim(),
      avatar: avatar || "🤖",
      system_prompt: system_prompt.trim(),
      purpose: purpose?.trim() || null,
      color: color || "blue",
      is_preset: false,
      sort_order: (count || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Erreur de création" }, { status: 500 });
  }

  return NextResponse.json({ assistant });
}
