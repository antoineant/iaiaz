import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface CreateFamilyRequest {
  familyName: string;
  childCount: number;
  extraParentCount: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body: CreateFamilyRequest = await request.json();
    const { familyName, childCount, extraParentCount } = body;

    if (!familyName?.trim()) {
      return NextResponse.json({ error: "Nom de famille requis" }, { status: 400 });
    }

    if (!childCount || childCount < 1 || childCount > 6) {
      return NextResponse.json({ error: "Nombre d'enfants invalide (1-6)" }, { status: 400 });
    }

    if (extraParentCount < 0 || extraParentCount > 2) {
      return NextResponse.json({ error: "Nombre de parents supplémentaires invalide (0-2)" }, { status: 400 });
    }

    // Check user doesn't already own a family org
    const { data: existingMembership } = await adminClient
      .from("organization_members")
      .select(`
        id,
        organization:organizations (id, type)
      `)
      .eq("user_id", user.id)
      .eq("role", "owner")
      .eq("status", "active");

    const hasFamily = existingMembership?.some((m) => {
      const org = m.organization as unknown as { id: string; type: string };
      return org?.type === "family";
    });

    if (hasFamily) {
      return NextResponse.json(
        { error: "Vous avez deja un plan Familia actif" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = familyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Math.random().toString(36).substring(2, 8);

    const welcomeCredit = 1.0 * childCount;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    // Create the family organization
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: familyName,
        slug,
        type: "family",
        contact_email: user.email,
        contact_name: user.user_metadata?.full_name || user.email,
        credit_balance: welcomeCredit,
        max_family_members: childCount + extraParentCount + 1,
        status: "active",
        subscription_status: "trialing",
        subscription_trial_end: trialEnd.toISOString(),
        settings: {
          allowed_models: null,
          conversation_visibility: "stats_only",
          alert_threshold_percent: 80,
        },
      })
      .select()
      .single();

    if (orgError || !org) {
      console.error("Error creating family org:", orgError);
      return NextResponse.json(
        { error: "Erreur lors de la creation de la famille" },
        { status: 500 }
      );
    }

    // Add the parent as owner
    const { error: memberError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
        display_name: user.user_metadata?.full_name || user.email?.split("@")[0],
        supervision_mode: "adult",
        age_bracket: "18+",
        status: "active",
      });

    if (memberError) {
      console.error("Error adding parent as member:", memberError);
      // Rollback org creation
      await adminClient.from("organizations").delete().eq("id", org.id);
      return NextResponse.json(
        { error: "Erreur lors de la configuration de la famille" },
        { status: 500 }
      );
    }

    // Sync parent's personal balance with org balance
    await adminClient
      .from("profiles")
      .update({ credits_balance: welcomeCredit })
      .eq("id", user.id);

    // Log the welcome credit transaction
    await adminClient.from("organization_transactions").insert({
      organization_id: org.id,
      type: "purchase",
      amount: welcomeCredit,
      description: `Credit de bienvenue Familia (${welcomeCredit}€ offert pour ${childCount} enfant${childCount > 1 ? "s" : ""})`,
    });

    return NextResponse.json({
      success: true,
      organizationId: org.id,
      slug: org.slug,
    });
  } catch (error) {
    console.error("Create family error:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
