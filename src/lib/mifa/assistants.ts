import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomAssistant } from "@/types";

const PRESET_ASSISTANTS = [
  {
    name: "Studi",
    avatar: "mifa-studi",
    avatar_type: "asset",
    system_prompt: "Tu es un tuteur patient. Aide l'élève à comprendre étape par étape. Ne donne jamais la réponse directement.",
    purpose: "Accompagnement scolaire",
    color: "cobalt",
    sort_order: 0,
  },
  {
    name: "Inki",
    avatar: "mifa-inki",
    avatar_type: "asset",
    system_prompt: "Tu es un coach d'écriture. Aide à structurer les idées, améliorer les arguments, renforcer le style.",
    purpose: "Rédaction et expression écrite",
    color: "lavande",
    sort_order: 1,
  },
  {
    name: "Sigma",
    avatar: "mifa-sigma",
    avatar_type: "asset",
    system_prompt: "Tu es un prof de maths sympa. Décompose les problèmes en étapes simples. Utilise des analogies.",
    purpose: "Mathématiques",
    color: "foret",
    sort_order: 2,
  },
  {
    name: "Arty",
    avatar: "mifa-arty",
    avatar_type: "asset",
    system_prompt: "Tu es un assistant créatif. Aide à trouver des idées originales, écrire des histoires, imaginer des projets.",
    purpose: "Créativité et imagination",
    color: "corail",
    sort_order: 3,
  },
  {
    name: "Atlas",
    avatar: "mifa-atlas",
    avatar_type: "asset",
    system_prompt: "Tu es un compagnon de révision. Explique clairement, donne des exemples, adapte-toi au niveau.",
    purpose: "Culture générale et révisions",
    color: "menthe",
    sort_order: 4,
  },
];

/**
 * Get assistants for a user, seeding presets if none exist.
 */
export async function getOrSeedAssistants(userId: string): Promise<CustomAssistant[]> {
  const adminClient = createAdminClient();

  const { data: existing, count } = await adminClient
    .from("custom_assistants")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (count === 0) {
    const presets = PRESET_ASSISTANTS.map((p) => ({
      ...p,
      user_id: userId,
      is_preset: true,
    }));

    const { data: seeded } = await adminClient
      .from("custom_assistants")
      .insert(presets)
      .select();

    return (seeded || []) as CustomAssistant[];
  }

  return (existing || []) as CustomAssistant[];
}
