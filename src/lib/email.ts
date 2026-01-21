import { Resend } from "resend";

// Initialize Resend client lazily to avoid build errors when API key is not set
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Default sender configuration
const DEFAULT_FROM = "iaiaz <admin@iaiaz.com>";
const SUPPORT_EMAIL = "admin@iaiaz.com";

// Email types
interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  data?: { id: string };
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: options.from || DEFAULT_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || SUPPORT_EMAIL,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Email send error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Send welcome email after signup confirmation
 */
export async function sendWelcomeEmail(
  to: string,
  userName?: string
): Promise<EmailResult> {
  const name = userName || "cher utilisateur";

  return sendEmail({
    to,
    subject: "Bienvenue sur iaiaz - Votre euro gratuit vous attend !",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #7c3aed; margin: 0;">iaiaz</h1>
  </div>

  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Bienvenue ${name} !</h2>

  <p style="margin-bottom: 16px;">
    Votre compte est maintenant activé et vous disposez de <strong style="color: #7c3aed;">1€ de crédits offerts</strong> pour découvrir nos modèles d'IA.
  </p>

  <p style="margin-bottom: 16px;">
    Avec iaiaz, vous avez accès à :
  </p>

  <ul style="margin-bottom: 24px; padding-left: 20px;">
    <li style="margin-bottom: 8px;"><strong>Claude</strong> (Anthropic) - Excellent pour la rédaction et l'analyse</li>
    <li style="margin-bottom: 8px;"><strong>GPT-5</strong> (OpenAI) - Le modèle polyvalent par excellence</li>
    <li style="margin-bottom: 8px;"><strong>Gemini</strong> (Google) - Puissant pour le raisonnement</li>
    <li style="margin-bottom: 8px;"><strong>Mistral</strong> - Le champion français, rapide et efficace</li>
  </ul>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://www.iaiaz.com/chat" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Commencer une conversation
    </a>
  </div>

  <p style="margin-bottom: 16px;">
    <strong>Pas d'abonnement, pas de surprise :</strong> vous ne payez que ce que vous utilisez, au token près.
  </p>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    Une question ? Répondez simplement à cet email.<br>
    L'équipe iaiaz
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    BAJURIAN SAS - 135 Avenue des Pyrénées, 31830 Plaisance du Touch<br>
    <a href="https://www.iaiaz.com/legal/cgu" style="color: #9ca3af;">CGU</a> ·
    <a href="https://www.iaiaz.com/legal/privacy" style="color: #9ca3af;">Confidentialité</a>
  </p>
</body>
</html>
    `,
    text: `Bienvenue sur iaiaz !

Votre compte est maintenant activé et vous disposez de 1€ de crédits offerts pour découvrir nos modèles d'IA.

Avec iaiaz, vous avez accès à :
- Claude (Anthropic) - Excellent pour la rédaction et l'analyse
- GPT-5 (OpenAI) - Le modèle polyvalent par excellence
- Gemini (Google) - Puissant pour le raisonnement
- Mistral - Le champion français, rapide et efficace

Commencer une conversation : https://www.iaiaz.com/chat

Pas d'abonnement, pas de surprise : vous ne payez que ce que vous utilisez.

Une question ? Répondez simplement à cet email.
L'équipe iaiaz
`,
  });
}

/**
 * Send low credits warning email
 */
export async function sendLowCreditsEmail(
  to: string,
  remainingCredits: number
): Promise<EmailResult> {
  const formattedCredits = remainingCredits.toFixed(2);

  return sendEmail({
    to,
    subject: `iaiaz - Plus que ${formattedCredits}€ de crédits`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #7c3aed; margin: 0;">iaiaz</h1>
  </div>

  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Vos crédits sont bientôt épuisés</h2>

  <p style="margin-bottom: 16px;">
    Il vous reste <strong style="color: #f59e0b;">${formattedCredits}€</strong> de crédits sur votre compte iaiaz.
  </p>

  <p style="margin-bottom: 24px;">
    Pour continuer à utiliser nos modèles d'IA sans interruption, rechargez votre compte dès maintenant.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://www.iaiaz.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Recharger mes crédits
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    L'équipe iaiaz
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    BAJURIAN SAS - 135 Avenue des Pyrénées, 31830 Plaisance du Touch
  </p>
</body>
</html>
    `,
    text: `Vos crédits sont bientôt épuisés

Il vous reste ${formattedCredits}€ de crédits sur votre compte iaiaz.

Pour continuer à utiliser nos modèles d'IA sans interruption, rechargez votre compte :
https://www.iaiaz.com/dashboard

L'équipe iaiaz
`,
  });
}

/**
 * Send credits purchase confirmation email
 */
export async function sendCreditsPurchaseEmail(
  to: string,
  amount: number,
  newBalance: number
): Promise<EmailResult> {
  const formattedAmount = amount.toFixed(2);
  const formattedBalance = newBalance.toFixed(2);

  return sendEmail({
    to,
    subject: `iaiaz - Confirmation d'achat de ${formattedAmount}€`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #7c3aed; margin: 0;">iaiaz</h1>
  </div>

  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Merci pour votre achat !</h2>

  <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <p style="margin: 0 0 8px 0; color: #6b7280;">Montant ajouté</p>
    <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10b981;">${formattedAmount}€</p>
  </div>

  <p style="margin-bottom: 16px;">
    Votre nouveau solde est de <strong style="color: #7c3aed;">${formattedBalance}€</strong>.
  </p>

  <p style="margin-bottom: 24px;">
    Vos crédits sont disponibles immédiatement pour utiliser tous nos modèles d'IA.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://www.iaiaz.com/chat" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Continuer mes conversations
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    Merci de votre confiance,<br>
    L'équipe iaiaz
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    BAJURIAN SAS - SIRET 828 446 435<br>
    135 Avenue des Pyrénées, 31830 Plaisance du Touch<br>
    <a href="https://www.iaiaz.com/legal/cgv" style="color: #9ca3af;">CGV</a>
  </p>
</body>
</html>
    `,
    text: `Merci pour votre achat !

Montant ajouté : ${formattedAmount}€
Nouveau solde : ${formattedBalance}€

Vos crédits sont disponibles immédiatement pour utiliser tous nos modèles d'IA.

Continuer mes conversations : https://www.iaiaz.com/chat

Merci de votre confiance,
L'équipe iaiaz

BAJURIAN SAS - SIRET 828 446 435
135 Avenue des Pyrénées, 31830 Plaisance du Touch
`,
  });
}

/**
 * Send organization credits purchase confirmation email
 */
export async function sendOrgCreditsPurchaseEmail(
  to: string,
  organizationName: string,
  amount: number,
  newBalance: number
): Promise<EmailResult> {
  const formattedAmount = amount.toFixed(2);
  const formattedBalance = newBalance.toFixed(2);

  return sendEmail({
    to,
    subject: `iaiaz - ${formattedAmount}€ ajoutés à ${organizationName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #2563eb; margin: 0;">iaiaz</h1>
  </div>

  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Crédits ajoutés à votre organisation</h2>

  <div style="background: #eff6ff; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #bfdbfe;">
    <p style="margin: 0 0 4px 0; color: #1e40af; font-weight: 600;">${organizationName}</p>
    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">Crédits organisation</p>
    <p style="margin: 0 0 8px 0; color: #6b7280;">Montant ajouté</p>
    <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10b981;">+${formattedAmount}€</p>
  </div>

  <p style="margin-bottom: 16px;">
    Le nouveau solde de votre organisation est de <strong style="color: #2563eb;">${formattedBalance}€</strong>.
  </p>

  <p style="margin-bottom: 24px;">
    Ces crédits peuvent être alloués à vos formateurs et étudiants depuis votre tableau de bord.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://www.iaiaz.com/org" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Gérer mon organisation
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    Merci de votre confiance,<br>
    L'équipe iaiaz
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    BAJURIAN SAS - SIRET 828 446 435<br>
    135 Avenue des Pyrénées, 31830 Plaisance du Touch<br>
    <a href="https://www.iaiaz.com/legal/cgv" style="color: #9ca3af;">CGV</a>
  </p>
</body>
</html>
    `,
    text: `Crédits ajoutés à votre organisation

Organisation : ${organizationName}
Montant ajouté : ${formattedAmount}€
Nouveau solde : ${formattedBalance}€

Ces crédits peuvent être alloués à vos formateurs et étudiants depuis votre tableau de bord.

Gérer mon organisation : https://www.iaiaz.com/org

Merci de votre confiance,
L'équipe iaiaz

BAJURIAN SAS - SIRET 828 446 435
135 Avenue des Pyrénées, 31830 Plaisance du Touch
`,
  });
}

/**
 * Send subscription-related emails (created, canceled, payment failed)
 */
export async function sendSubscriptionEmail(
  to: string,
  organizationName: string,
  planId: string,
  eventType: "created" | "canceled" | "payment_failed",
  trialEnd?: Date
): Promise<EmailResult> {
  const planNames: Record<string, string> = {
    "trainer-pro": "Formateur Pro",
    "school-seat": "Établissement",
  };
  const planName = planNames[planId] || planId;

  // Different email content based on event type
  if (eventType === "created") {
    const trialInfo = trialEnd
      ? `<p style="margin-bottom: 16px; padding: 12px; background: #fef3c7; border-radius: 8px; color: #92400e;">
          <strong>Essai gratuit :</strong> Votre période d'essai se termine le ${trialEnd.toLocaleDateString("fr-FR")}. Aucun paiement ne sera prélevé avant cette date.
        </p>`
      : "";

    return sendEmail({
      to,
      subject: `iaiaz - Bienvenue dans ${planName} !`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #2563eb; margin: 0;">iaiaz</h1>
  </div>

  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Bienvenue dans votre abonnement !</h2>

  <div style="background: #eff6ff; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #bfdbfe;">
    <p style="margin: 0 0 4px 0; color: #1e40af; font-weight: 600;">${organizationName}</p>
    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">Abonnement activé</p>
    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #2563eb;">${planName}</p>
  </div>

  ${trialInfo}

  <p style="margin-bottom: 16px;">
    Votre abonnement ${planName} est maintenant actif. Vous avez accès à toutes les fonctionnalités incluses :
  </p>

  <ul style="margin-bottom: 24px; padding-left: 20px;">
    <li style="margin-bottom: 8px;">Tableau de bord analytics complet</li>
    <li style="margin-bottom: 8px;">Gestion des classes et étudiants</li>
    <li style="margin-bottom: 8px;">Allocation de crédits</li>
    <li style="margin-bottom: 8px;">Support prioritaire</li>
  </ul>

  <p style="margin-bottom: 24px; font-size: 14px; color: #6b7280;">
    <strong>Rappel :</strong> L'abonnement couvre l'accès à la plateforme. Les crédits pour l'utilisation de l'IA se gèrent séparément.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://www.iaiaz.com/org" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Accéder à mon tableau de bord
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    Bienvenue parmi nous,<br>
    L'équipe iaiaz
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    BAJURIAN SAS - SIRET 828 446 435<br>
    135 Avenue des Pyrénées, 31830 Plaisance du Touch<br>
    <a href="https://www.iaiaz.com/legal/cgv" style="color: #9ca3af;">CGV</a>
  </p>
</body>
</html>
      `,
      text: `Bienvenue dans votre abonnement !

Organisation : ${organizationName}
Plan : ${planName}

${trialEnd ? `Essai gratuit jusqu'au ${trialEnd.toLocaleDateString("fr-FR")}` : ""}

Votre abonnement ${planName} est maintenant actif.

Rappel : L'abonnement couvre l'accès à la plateforme. Les crédits pour l'utilisation de l'IA se gèrent séparément.

Accéder à mon tableau de bord : https://www.iaiaz.com/org

L'équipe iaiaz
`,
    });
  }

  if (eventType === "canceled") {
    return sendEmail({
      to,
      subject: `iaiaz - Confirmation d'annulation de votre abonnement`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #2563eb; margin: 0;">iaiaz</h1>
  </div>

  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Votre abonnement a été annulé</h2>

  <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #fecaca;">
    <p style="margin: 0 0 4px 0; color: #991b1b; font-weight: 600;">${organizationName}</p>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Abonnement ${planName} annulé</p>
  </div>

  <p style="margin-bottom: 16px;">
    Nous confirmons l'annulation de votre abonnement ${planName} pour ${organizationName}.
  </p>

  <p style="margin-bottom: 24px;">
    <strong>Important :</strong> Vos crédits restants sont toujours disponibles et vos étudiants peuvent continuer à utiliser la plateforme jusqu'à épuisement des crédits.
  </p>

  <p style="margin-bottom: 24px;">
    Vous pouvez réactiver votre abonnement à tout moment depuis votre tableau de bord.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://www.iaiaz.com/org/subscription" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Réactiver mon abonnement
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    Une question ? Contactez-nous.<br>
    L'équipe iaiaz
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    BAJURIAN SAS - SIRET 828 446 435<br>
    135 Avenue des Pyrénées, 31830 Plaisance du Touch
  </p>
</body>
</html>
      `,
      text: `Votre abonnement a été annulé

Organisation : ${organizationName}
Plan annulé : ${planName}

Nous confirmons l'annulation de votre abonnement.

Important : Vos crédits restants sont toujours disponibles et vos étudiants peuvent continuer à utiliser la plateforme jusqu'à épuisement des crédits.

Réactiver mon abonnement : https://www.iaiaz.com/org/subscription

L'équipe iaiaz
`,
    });
  }

  if (eventType === "payment_failed") {
    return sendEmail({
      to,
      subject: `iaiaz - Action requise : paiement échoué`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #2563eb; margin: 0;">iaiaz</h1>
  </div>

  <h2 style="font-size: 24px; color: #dc2626; margin-bottom: 16px;">Paiement échoué</h2>

  <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #fecaca;">
    <p style="margin: 0 0 4px 0; color: #991b1b; font-weight: 600;">${organizationName}</p>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Abonnement ${planName}</p>
  </div>

  <p style="margin-bottom: 16px;">
    Le paiement de votre abonnement ${planName} a échoué. Veuillez mettre à jour votre moyen de paiement pour éviter une interruption de service.
  </p>

  <p style="margin-bottom: 24px; padding: 12px; background: #fef3c7; border-radius: 8px; color: #92400e;">
    <strong>Action requise :</strong> Mettez à jour votre carte bancaire dans les 7 jours pour maintenir votre accès.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://www.iaiaz.com/org/subscription" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Mettre à jour mon paiement
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
    Besoin d'aide ? Contactez-nous.<br>
    L'équipe iaiaz
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    BAJURIAN SAS - SIRET 828 446 435<br>
    135 Avenue des Pyrénées, 31830 Plaisance du Touch
  </p>
</body>
</html>
      `,
      text: `Paiement échoué

Organisation : ${organizationName}
Plan : ${planName}

Le paiement de votre abonnement a échoué. Veuillez mettre à jour votre moyen de paiement pour éviter une interruption de service.

Action requise : Mettez à jour votre carte bancaire dans les 7 jours.

Mettre à jour mon paiement : https://www.iaiaz.com/org/subscription

L'équipe iaiaz
`,
    });
  }

  // Default fallback
  return { success: false, error: "Unknown event type" };
}
