import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

interface InviteMemberRequest {
  email: string;
  name: string;
  role: "admin" | "student"; // admin = parent, student = child
  birthdate?: string; // ISO date string for children
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

    // Get user's family org (must be owner or admin)
    const { data: membership } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        organization:organizations (id, name, type, max_family_members)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Vous devez etre parent de la famille" },
        { status: 403 }
      );
    }

    const org = membership.organization as unknown as {
      id: string;
      name: string;
      type: string;
      max_family_members: number;
    };

    if (org.type !== "family") {
      return NextResponse.json(
        { error: "Cette organisation n'est pas un plan Familia" },
        { status: 400 }
      );
    }

    // Check member count
    const { count: currentMembers } = await adminClient
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("status", "active");

    const { count: pendingInvites } = await adminClient
      .from("organization_invites")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("status", "pending")
      .gte("expires_at", new Date().toISOString());

    const totalCount = (currentMembers || 0) + (pendingInvites || 0);

    if (totalCount >= org.max_family_members) {
      return NextResponse.json(
        { error: `Votre plan est limite a ${org.max_family_members} membres` },
        { status: 400 }
      );
    }

    const body: InviteMemberRequest & { locale?: string } = await request.json();
    const { email, name, role, birthdate, locale } = body;

    if (!email?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: "Email et nom requis" },
        { status: 400 }
      );
    }

    // Check if already invited or member
    const { data: existingInvite } = await adminClient
      .from("organization_invites")
      .select("id")
      .eq("organization_id", org.id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "Cette personne a deja ete invitee" },
        { status: 400 }
      );
    }

    // Create invite
    const { data: invite, error: inviteError } = await adminClient
      .from("organization_invites")
      .insert({
        organization_id: org.id,
        email: email.toLowerCase(),
        role: role,
        credit_amount: 0, // Family credits come from shared pool
        invited_by: user.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("token")
      .single();

    if (inviteError || !invite) {
      console.error("Error creating invite:", inviteError);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'invitation" },
        { status: 500 }
      );
    }

    // Send invitation email
    const localePrefix = locale && locale !== "fr" ? `/${locale}` : "";
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}${localePrefix}/familia/join/${invite.token}`;
    const isChild = role === "student";

    await sendEmail({
      to: email,
      subject: isChild
        ? `${org.name} - Tes parents t'invitent sur iaiaz !`
        : `Rejoignez ${org.name} sur iaiaz Familia`,
      html: isChild
        ? buildChildInviteEmail(name, org.name, inviteUrl)
        : buildParentInviteEmail(name, org.name, inviteUrl),
    });

    return NextResponse.json({
      success: true,
      inviteId: invite.token,
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}

function buildChildInviteEmail(name: string, familyName: string, inviteUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #0ea5e9, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">Familia by iaiaz</h1>
  </div>

  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Hey ${name} !</h2>

  <p style="margin-bottom: 16px;">
    Tes parents t'invitent a rejoindre <strong>${familyName}</strong> sur iaiaz.
  </p>

  <p style="margin-bottom: 16px;">
    Tu vas pouvoir utiliser l'IA pour tes devoirs, tes projets creatifs, et apprendre plein de nouvelles choses !
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #d946ef); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 18px;">
      Rejoindre ma famille
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    L'equipe iaiaz
  </p>
</body>
</html>`;
}

function buildParentInviteEmail(name: string, familyName: string, inviteUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #0ea5e9; margin: 0;">Familia by iaiaz</h1>
  </div>

  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Bonjour ${name},</h2>

  <p style="margin-bottom: 16px;">
    Vous etes invite(e) a rejoindre <strong>${familyName}</strong> sur iaiaz Familia en tant que parent.
  </p>

  <p style="margin-bottom: 16px;">
    Vous aurez acces au tableau de bord parental, aux controles et au suivi de l'utilisation de l'IA par votre famille.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #2563eb); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Rejoindre la famille
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    L'equipe iaiaz
  </p>
</body>
</html>`;
}
