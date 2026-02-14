import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Get user's family org (must be parent)
    const { data: membership } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        organization:organizations (id, type)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const org = membership.organization as unknown as { id: string; type: string };
    if (org.type !== "family") {
      return NextResponse.json({ error: "Pas un plan Familia" }, { status: 400 });
    }

    // Get days parameter
    const days = parseInt(request.nextUrl.searchParams.get("days") || "7", 10);

    // Call the family usage summary function
    const { data: summary, error } = await supabase.rpc("get_family_usage_summary", {
      p_org_id: org.id,
      p_days: Math.min(days, 90),
    });

    if (error) {
      console.error("Error getting family summary:", error);
      return NextResponse.json(
        { error: "Erreur lors du chargement des donnees" },
        { status: 500 }
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Family analytics error:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
