import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { share_code } = body;

  if (!share_code || typeof share_code !== "string") {
    return NextResponse.json({ error: "Code de partage requis" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Lookup assistant by share_code
  const { data: source } = await adminClient
    .from("custom_assistants")
    .select("*")
    .eq("share_code", share_code.toUpperCase().replace(/^MIFA-/, ""))
    .single();

  if (!source) {
    return NextResponse.json({ error: "Code invalide" }, { status: 404 });
  }

  // Check assistant limit
  const { count } = await adminClient
    .from("custom_assistants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count || 0) >= 20) {
    return NextResponse.json({ error: "Maximum 20 mifas" }, { status: 400 });
  }

  // Copy the assistant to the requesting user
  const { data: adopted, error } = await adminClient
    .from("custom_assistants")
    .insert({
      user_id: user.id,
      name: source.name,
      avatar: source.avatar,
      avatar_type: source.avatar_type || "emoji",
      system_prompt: source.system_prompt,
      purpose: source.purpose,
      color: source.color,
      gauges: source.gauges,
      is_preset: false,
      sort_order: (count || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Erreur lors de l'adoption" }, { status: 500 });
  }

  return NextResponse.json({ assistant: adopted });
}
