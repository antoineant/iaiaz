import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { name, avatar, system_prompt, purpose, color } = body;

  if (name && name.length > 50) {
    return NextResponse.json({ error: "Nom trop long (50 caractères max)" }, { status: 400 });
  }

  if (system_prompt && system_prompt.length > 2000) {
    return NextResponse.json({ error: "Instructions trop longues (2000 caractères max)" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify ownership
  const { data: existing } = await adminClient
    .from("custom_assistants")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Assistant introuvable" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (avatar !== undefined) updates.avatar = avatar;
  if (system_prompt !== undefined) updates.system_prompt = system_prompt.trim();
  if (purpose !== undefined) updates.purpose = purpose?.trim() || null;
  if (color !== undefined) updates.color = color;

  const { data: updated, error } = await adminClient
    .from("custom_assistants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }

  return NextResponse.json({ assistant: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Verify ownership and allow deletion (conversations keep assistant_id = NULL via ON DELETE SET NULL)
  const { error } = await adminClient
    .from("custom_assistants")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
