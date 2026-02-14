import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAge, getSupervisionMode, getAgeBracket, validateBirthdate } from "@/lib/familia/age-verification";
import { initializeChildControls } from "@/lib/familia/parental-controls";

interface PendingMember {
  name: string;
  email: string;
  role: "admin" | "student";
  birthdate?: string;
}

interface CreateFamilyRequest {
  familyName: string;
  members?: PendingMember[];
  locale?: string;
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
    const { familyName, members: pendingMembers, locale } = body;

    if (!familyName?.trim()) {
      return NextResponse.json({ error: "Nom de famille requis" }, { status: 400 });
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

    // Count student members as children
    const childCount = pendingMembers?.filter(m => m.role === "student").length || 0;

    // Create the family organization
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: familyName,
        slug,
        type: "family",
        contact_email: user.email,
        contact_name: user.user_metadata?.full_name || user.email,
        credit_balance: 1.0, // 1€ welcome credit immediately
        max_family_members: childCount + 2, // children + 2 parents
        status: "active",
        settings: {
          allowed_models: null, // All models for now
          conversation_visibility: "stats_only",
          alert_threshold_percent: 80,
          // Store pending invites to send after payment
          ...(pendingMembers && pendingMembers.length > 0
            ? { pending_invites: pendingMembers, invite_locale: locale || "fr" }
            : {}),
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

    // Sync parent's personal balance with org balance (1€ welcome credit)
    const WELCOME_CREDIT = 1.0;

    await adminClient
      .from("profiles")
      .update({ credits_balance: WELCOME_CREDIT })
      .eq("id", user.id);

    // Log the welcome credit transaction
    await adminClient.from("organization_transactions").insert({
      organization_id: org.id,
      type: "purchase",
      amount: WELCOME_CREDIT,
      description: "Credit de bienvenue Familia (1€ offert)",
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
