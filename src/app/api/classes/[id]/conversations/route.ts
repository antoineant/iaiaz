import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: List conversations for a specific class (for the current user)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { id: classId } = await params;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Verify user is a member of this class
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("id, role, class_id")
      .eq("user_id", user.id)
      .eq("class_id", classId)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Vous n'êtes pas membre de cette classe" },
        { status: 403 }
      );
    }

    // Get conversations for this class belonging to this user
    const { data: conversations, error } = await adminClient
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("class_id", classId)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching class conversations:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des conversations" },
        { status: 500 }
      );
    }

    return NextResponse.json(conversations || []);
  } catch (error) {
    console.error("Class conversations API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
