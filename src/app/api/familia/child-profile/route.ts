import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_SCHOOL_YEARS = [
  "6eme", "5eme", "4eme", "3eme",
  "seconde", "premiere", "terminale", "superieur",
];

// GET: Get child profile (display_name, birthdate, school_year)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const childUserId = request.nextUrl.searchParams.get("childId");
    if (!childUserId) {
      return NextResponse.json({ error: "childId requis" }, { status: 400 });
    }

    // Verify caller is owner/admin in a family org
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

    // Verify child is in this family
    const adminClient = createAdminClient();
    const { data: childMember } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", org.id)
      .eq("user_id", childUserId)
      .eq("status", "active")
      .single();

    if (!childMember) {
      return NextResponse.json({ error: "Enfant introuvable dans cette famille" }, { status: 404 });
    }

    // Fetch child profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name, birthdate, school_year")
      .eq("id", childUserId)
      .single();

    return NextResponse.json({ profile: profile || { display_name: null, birthdate: null, school_year: null } });
  } catch (error) {
    console.error("Get child profile error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// PUT: Update child profile fields
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await request.json();
    const { childUserId, profile } = body as {
      childUserId: string;
      profile: { display_name?: string; birthdate?: string; school_year?: string };
    };

    if (!childUserId) {
      return NextResponse.json({ error: "childUserId requis" }, { status: 400 });
    }

    // Validate fields
    const updates: Record<string, unknown> = {};

    if (profile.display_name !== undefined) {
      const name = profile.display_name.trim();
      if (!name || name.length > 50) {
        return NextResponse.json({ error: "Nom invalide (1-50 caractères)" }, { status: 400 });
      }
      updates.display_name = name;
    }

    if (profile.birthdate !== undefined) {
      const date = new Date(profile.birthdate);
      if (isNaN(date.getTime()) || date > new Date()) {
        return NextResponse.json({ error: "Date de naissance invalide" }, { status: 400 });
      }
      updates.birthdate = profile.birthdate;
    }

    if (profile.school_year !== undefined) {
      if (!VALID_SCHOOL_YEARS.includes(profile.school_year)) {
        return NextResponse.json({ error: "Classe invalide" }, { status: 400 });
      }
      updates.school_year = profile.school_year;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
    }

    // Verify caller is owner/admin in a family org
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

    // Verify child is a member of this family
    const adminClient = createAdminClient();
    const { data: childMember } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", org.id)
      .eq("user_id", childUserId)
      .eq("status", "active")
      .single();

    if (!childMember) {
      return NextResponse.json({ error: "Enfant introuvable dans cette famille" }, { status: 404 });
    }

    // Update profile
    const { error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", childUserId);

    if (error) {
      console.error("Update child profile error:", error);
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update child profile error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
