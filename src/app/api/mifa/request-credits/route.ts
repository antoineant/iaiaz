import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { sendPushToUsers } from "@/lib/push";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get child's membership + org
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id, role, organizations(type, name)")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const org = membership.organizations as unknown as { type: string; name: string };
    if (org?.type !== "family") {
      return NextResponse.json({ error: "Pas un plan Mifa" }, { status: 400 });
    }

    // Get child's profile (name + balance)
    const { data: childProfile } = await admin
      .from("profiles")
      .select("display_name, credits_balance")
      .eq("id", user.id)
      .single();

    const childName = childProfile?.display_name || "Votre enfant";
    const balance = Number(childProfile?.credits_balance || 0);

    // Find parent emails (owner/admin in the same family org)
    const { data: parents } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", membership.organization_id)
      .in("role", ["owner", "admin"])
      .neq("user_id", user.id);

    if (!parents || parents.length === 0) {
      return NextResponse.json({ error: "Aucun parent trouve" }, { status: 404 });
    }

    const parentIds = parents.map((p) => p.user_id);
    const { data: parentProfiles } = await admin
      .from("profiles")
      .select("email, display_name")
      .in("id", parentIds);

    const parentEmails = parentProfiles?.map((p) => p.email).filter(Boolean) as string[];

    if (parentEmails.length === 0) {
      return NextResponse.json({ error: "Aucun email parent trouve" }, { status: 404 });
    }

    // Build dashboard URL
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/mifa/dashboard`;

    // Send email
    const result = await sendEmail({
      to: parentEmails,
      subject: `${childName} a besoin de credits sur iaiaz`,
      html: buildCreditRequestEmail(childName, balance, org.name, dashboardUrl),
    });

    if (!result.success) {
      console.error("Credit request email error:", result.error);
      return NextResponse.json({ error: "Erreur d'envoi" }, { status: 500 });
    }

    // Push notification to parents (fire-and-forget)
    sendPushToUsers(parentIds, {
      title: `${childName} a besoin de crédits`,
      body: `Solde actuel : ${balance.toFixed(2)}€. Ouvrez l'app pour transférer des crédits.`,
      data: { type: "credit_request", childId: user.id },
    }).catch((err) => console.error("📱 Push failed for credit request:", err));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Request credits error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

function buildCreditRequestEmail(
  childName: string,
  balance: number,
  familyName: string,
  dashboardUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #0ea5e9; margin: 0;">Mifa by iaiaz</h1>
  </div>

  <h2 style="font-size: 20px; color: #1f2937; margin-bottom: 16px;">Demande de credits</h2>

  <p style="margin-bottom: 16px;">
    <strong>${childName}</strong> a bientot plus de credits sur <strong>${familyName}</strong> et vous demande d'en ajouter.
  </p>

  <div style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 14px; color: #9A3412;">
      Solde actuel : <strong>${balance.toFixed(2)} &euro;</strong>
    </p>
  </div>

  <p style="margin-bottom: 16px;">
    Vous pouvez ajouter des credits depuis votre tableau de bord Mifa.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #d946ef); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
      Ouvrir le tableau de bord
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    L'equipe iaiaz
  </p>
</body>
</html>`;
}
