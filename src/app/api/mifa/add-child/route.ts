import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculateAge,
  getSupervisionMode,
  getAgeBracket,
  validateBirthdate,
} from "@/lib/mifa/age-verification";
import { initializeChildControls } from "@/lib/mifa/parental-controls";
import crypto from "crypto";

interface AddChildRequest {
  name: string;
  birthdate: string; // ISO date
  schoolYear?: string;
}

function generateUsername(name: string, familySlug: string): string {
  const cleanName = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  const suffix = crypto.randomBytes(2).toString("hex");
  return `${cleanName}.${suffix}`;
}

function generatePassword(): string {
  const words = ["Mifa", "Star", "Luna", "Nova", "Ciel", "Soleil", "Pixel", "Astro"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = crypto.randomInt(100, 999);
  const special = ["!", "#", "+", "="][Math.floor(Math.random() * 4)];
  return `${word}-${digits}${special}`;
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

    // Verify parent owns a family org
    const { data: membership } = await adminClient
      .from("organization_members")
      .select(`
        organization_id,
        role,
        organization:organizations!inner (id, slug, type, max_family_members)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("organizations.type", "family")
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "Vous devez etre parent d'une famille Mifa" },
        { status: 403 }
      );
    }

    const org = membership.organization as unknown as {
      id: string;
      slug: string;
      type: string;
      max_family_members: number;
    };

    // Check member count
    const { count: currentMembers } = await adminClient
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("status", "active");

    if ((currentMembers ?? 0) >= org.max_family_members) {
      return NextResponse.json(
        { error: "Nombre maximum de membres atteint" },
        { status: 400 }
      );
    }

    const body: AddChildRequest = await request.json();
    const { name, birthdate, schoolYear } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Prenom requis" }, { status: 400 });
    }

    if (!birthdate) {
      return NextResponse.json(
        { error: "Date de naissance requise" },
        { status: 400 }
      );
    }

    // Validate age
    const birthdateObj = new Date(birthdate);
    const validation = validateBirthdate(birthdateObj);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const age = calculateAge(birthdateObj);
    const supervisionMode = getSupervisionMode(age);
    const ageBracket = getAgeBracket(age);

    // Generate credentials
    const username = generateUsername(name, org.slug);
    const childEmail = `${username}@mifa.iaiaz.com`;
    const password = generatePassword();

    // Create the child auth user (email auto-confirmed, no confirmation email)
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: childEmail,
        password,
        email_confirm: true, // Auto-confirm - parent is trusted authority
        user_metadata: {
          account_type: "child",
          display_name: name.trim(),
          parent_user_id: user.id,
        },
      });

    if (authError || !authData.user) {
      console.error("Error creating child auth user:", authError);
      return NextResponse.json(
        { error: "Erreur lors de la creation du compte enfant" },
        { status: 500 }
      );
    }

    const childUserId = authData.user.id;

    // Update profile with child-specific fields
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        birthdate,
        school_year: schoolYear || null,
        needs_service_selection: false,
      })
      .eq("id", childUserId);

    if (profileError) {
      console.error("Error updating child profile:", profileError);
      // Rollback auth user
      await adminClient.auth.admin.deleteUser(childUserId);
      return NextResponse.json(
        { error: "Erreur lors de la configuration du profil enfant" },
        { status: 500 }
      );
    }

    // Add child to family org
    const { error: memberError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: childUserId,
        role: "student",
        display_name: name.trim(),
        supervision_mode: supervisionMode,
        age_bracket: ageBracket,
        status: "active",
      });

    if (memberError) {
      console.error("Error adding child to org:", memberError);
      await adminClient.auth.admin.deleteUser(childUserId);
      return NextResponse.json(
        { error: "Erreur lors de l'ajout a la famille" },
        { status: 500 }
      );
    }

    // Initialize parental controls
    await initializeChildControls(org.id, childUserId, supervisionMode, user.id);

    return NextResponse.json({
      success: true,
      child: {
        id: childUserId,
        name: name.trim(),
        username,
        password,
        email: childEmail,
        supervisionMode,
        ageBracket,
      },
    });
  } catch (error) {
    console.error("Add child error:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
