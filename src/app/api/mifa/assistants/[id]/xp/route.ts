import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLevel } from "@/lib/mifa/xp-levels";

export async function GET(
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

  const { count } = await adminClient
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("assistant_id", id)
    .eq("user_id", user.id);

  const conversationCount = count || 0;
  const xp = conversationCount * 10;
  const level = getLevel(xp);

  return NextResponse.json({
    xp,
    level: level.name,
    nextMinXp: level.nextMinXp,
    conversationCount,
  });
}
