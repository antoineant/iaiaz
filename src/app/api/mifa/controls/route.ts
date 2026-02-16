import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getParentalControls,
  upsertParentalControls,
  type ParentalControlSettings,
} from "@/lib/mifa/parental-controls";

// GET: Get parental controls for a child
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

    // Get user's family org
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
      return NextResponse.json({ error: "Pas un plan Mifa" }, { status: 400 });
    }

    const controls = await getParentalControls(org.id, childUserId);

    return NextResponse.json({ controls });
  } catch (error) {
    console.error("Get controls error:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}

// PUT: Update parental controls for a child
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
    const { childUserId, settings } = body as {
      childUserId: string;
      settings: Partial<ParentalControlSettings>;
    };

    if (!childUserId) {
      return NextResponse.json({ error: "childUserId requis" }, { status: 400 });
    }

    // Get user's family org
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
      return NextResponse.json({ error: "Pas un plan Mifa" }, { status: 400 });
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

    const result = await upsertParentalControls(org.id, childUserId, settings, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update controls error:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
