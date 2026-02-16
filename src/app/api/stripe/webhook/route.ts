import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, sendCreditsPurchaseEmail, sendOrgCreditsPurchaseEmail, sendSubscriptionEmail } from "@/lib/email";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  console.log(`Webhook received: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      if (metadata.type === "subscription") {
        // Subscription checkout - handled by customer.subscription.created
        console.log("Subscription checkout completed, waiting for subscription event");
      } else if (metadata.type === "organization") {
        await handleOrganizationPurchase(session, metadata);
      } else {
        await handlePersonalPurchase(session, metadata);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription, event.type);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(subscription);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await handleSubscriptionPayment(invoice);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await handleSubscriptionPaymentFailed(invoice);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

/**
 * Get receipt URL from a Stripe PaymentIntent
 */
async function getReceiptUrl(paymentIntentId: string): Promise<string | null> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Get the latest charge from the payment intent
    const chargeId = typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;

    if (!chargeId) {
      console.log("No charge found for payment intent");
      return null;
    }

    const charge = await stripe.charges.retrieve(chargeId);
    return charge.receipt_url || null;
  } catch (error) {
    console.error("Error fetching receipt URL:", error);
    return null;
  }
}

/**
 * Handle personal credit purchase (for individual users)
 */
async function handlePersonalPurchase(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { userId, packId, credits } = metadata;

  console.log("Personal purchase metadata:", { userId, packId, credits });

  if (!userId || !credits) {
    console.error("Missing metadata - userId:", userId, "credits:", credits);
    return;
  }

  const adminClient = createAdminClient();
  const paymentIntentId = session.payment_intent as string;

  // Get receipt URL from Stripe
  const receiptUrl = await getReceiptUrl(paymentIntentId);
  console.log("Receipt URL:", receiptUrl);

  // Add credits to user (with receipt URL)
  const { error } = await adminClient.rpc("add_credits", {
    p_user_id: userId,
    p_amount: parseFloat(credits),
    p_description: `Achat pack ${packId}`,
    p_stripe_payment_id: paymentIntentId,
    p_receipt_url: receiptUrl,
  });

  if (error) {
    console.error("Error adding credits:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return;
  }

  console.log(`Successfully added ${credits}€ credits to user ${userId}`);

  // Send purchase confirmation email
  const customerEmail = session.customer_details?.email;
  if (customerEmail) {
    // Get new balance
    const { data: userData } = await adminClient
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    const newBalance = userData?.credits_balance || parseFloat(credits);

    const emailResult = await sendCreditsPurchaseEmail(
      customerEmail,
      parseFloat(credits),
      newBalance
    );

    if (emailResult.success) {
      console.log(`Purchase confirmation email sent to ${customerEmail}`);
    } else {
      console.error(`Failed to send email: ${emailResult.error}`);
    }
  }
}

/**
 * Handle organization credit purchase (for schools/trainers)
 */
async function handleOrganizationPurchase(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { userId, organizationId, organizationName, packId, credits, discount } = metadata;

  console.log("Organization purchase metadata:", { userId, organizationId, organizationName, packId, credits, discount });

  if (!userId || !organizationId || !credits) {
    console.error("Missing org metadata - userId:", userId, "organizationId:", organizationId, "credits:", credits);
    return;
  }

  const adminClient = createAdminClient();
  const creditAmount = parseFloat(credits);
  const stripePaymentId = session.payment_intent as string;

  // Get receipt URL from Stripe
  const receiptUrl = await getReceiptUrl(stripePaymentId);
  console.log("Organization receipt URL:", receiptUrl);

  // 1. Update organization credit_balance and purchased_credits
  const { data: org, error: orgFetchError } = await adminClient
    .from("organizations")
    .select("credit_balance, purchased_credits")
    .eq("id", organizationId)
    .single();

  if (orgFetchError || !org) {
    console.error("Error fetching organization:", orgFetchError);
    return;
  }

  const newBalance = (org.credit_balance || 0) + creditAmount;
  const newPurchased = (org.purchased_credits || 0) + creditAmount;

  const { error: updateError } = await adminClient
    .from("organizations")
    .update({
      credit_balance: newBalance,
      purchased_credits: newPurchased,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (updateError) {
    console.error("Error updating organization credits:", updateError);
    return;
  }

  console.log(`Successfully added ${credits}€ credits to organization ${organizationId} (${organizationName})`);

  // 2. Log the transaction in organization_transactions (with receipt URL)
  const { error: txError } = await adminClient
    .from("organization_transactions")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      type: "purchase",
      amount: creditAmount,
      description: discount && parseInt(discount) > 0
        ? `Achat pack ${packId} (-${discount}%)`
        : `Achat pack ${packId}`,
      stripe_payment_id: stripePaymentId,
      receipt_url: receiptUrl,
    });

  if (txError) {
    console.error("Error logging organization transaction:", txError);
    // Don't return - credits were added, just logging failed
  }

  // 3. Send confirmation email
  const customerEmail = session.customer_details?.email;
  if (customerEmail) {
    const emailResult = await sendOrgCreditsPurchaseEmail(
      customerEmail,
      organizationName,
      creditAmount,
      newBalance
    );

    if (emailResult.success) {
      console.log(`Org purchase confirmation email sent to ${customerEmail}`);
    } else {
      console.error(`Failed to send org email: ${emailResult.error}`);
    }
  }
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  eventType: string
) {
  const metadata = subscription.metadata || {};
  const { organizationId, planId, seatCount } = metadata;

  console.log(`Subscription ${eventType}:`, { organizationId, planId, seatCount, status: subscription.status });

  if (!organizationId) {
    console.error("Missing organizationId in subscription metadata");
    return;
  }

  const adminClient = createAdminClient();

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
    incomplete: "none",
    incomplete_expired: "none",
    paused: "canceled",
  };

  const status = statusMap[subscription.status] || "none";

  // Update organization subscription (including seat_count for soft limit enforcement)
  const { error } = await adminClient
    .from("organizations")
    .update({
      subscription_plan_id: planId || null,
      subscription_status: status,
      subscription_stripe_id: subscription.id,
      subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      subscription_cancel_at_period_end: subscription.cancel_at_period_end,
      subscription_trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      seat_count: seatCount ? parseInt(seatCount, 10) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (error) {
    console.error("Error updating organization subscription:", error);
    return;
  }

  // Log subscription event
  await adminClient
    .from("organization_subscription_events")
    .insert({
      organization_id: organizationId,
      event_type: eventType === "customer.subscription.created" ? "subscription_created" : "subscription_updated",
      stripe_event_id: subscription.id,
      stripe_subscription_id: subscription.id,
      new_plan_id: planId,
      metadata: {
        status: subscription.status,
        seat_count: seatCount,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
    });

  console.log(`Successfully updated subscription for organization ${organizationId}`);

  // Send email notification for new subscriptions
  if (eventType === "customer.subscription.created") {
    const { data: org } = await adminClient
      .from("organizations")
      .select("name, contact_email, settings")
      .eq("id", organizationId)
      .single();

    if (org?.contact_email) {
      const emailResult = await sendSubscriptionEmail(
        org.contact_email,
        org.name,
        planId || "unknown",
        "created",
        subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined
      );

      if (emailResult.success) {
        console.log(`Subscription confirmation email sent to ${org.contact_email}`);
      }
    }

    // Send pending invites stored during signup (before payment)
    if (org?.settings) {
      const settings = org.settings as Record<string, unknown>;
      const pendingInvites = settings.pending_invites as Array<{
        email: string;
        name: string;
        role: string;
        birthdate?: string;
      }> | undefined;
      const inviteLocale = (settings.invite_locale as string) || "fr";

      if (pendingInvites && pendingInvites.length > 0) {
        // Find parent user_id (org owner) for invited_by
        const { data: owner } = await adminClient
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", organizationId)
          .eq("role", "owner")
          .single();

        const invitedBy = owner?.user_id || null;
        const localePrefix = inviteLocale !== "fr" ? `/${inviteLocale}` : "";

        for (const member of pendingInvites) {
          try {
            const { data: invite } = await adminClient
              .from("organization_invites")
              .insert({
                organization_id: organizationId,
                email: member.email.toLowerCase(),
                role: member.role,
                credit_amount: 0,
                invited_by: invitedBy,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .select("token")
              .single();

            if (invite) {
              const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}${localePrefix}/mifa/join/${invite.token}`;
              const isChild = member.role === "student";

              await sendEmail({
                to: member.email,
                subject: isChild
                  ? `${org.name} - Tes parents t'invitent sur iaiaz !`
                  : `Rejoignez ${org.name} sur iaiaz Mifa`,
                html: buildMifaInviteEmail(member.name, org.name, inviteUrl, isChild),
              });

              console.log(`Sent pending invite to ${member.email} for org ${organizationId}`);
            }
          } catch (err) {
            console.error(`Failed to send pending invite to ${member.email}:`, err);
          }
        }

        // Clear pending invites from settings
        const { pending_invites, invite_locale, ...cleanSettings } = settings;
        await adminClient
          .from("organizations")
          .update({ settings: cleanSettings })
          .eq("id", organizationId);
      }
    }

    // Allocate monthly credits at trial start (so family can use AI during trial)
    if (subscription.status === "trialing" && metadata.type === "mifa") {
      const creditsPerChild = parseFloat(metadata.creditsPerChild || "5");
      const childCount = parseInt(metadata.childCount || "1", 10);
      const monthlyCredits = creditsPerChild * childCount;

      if (monthlyCredits > 0) {
        const { data: currentOrg } = await adminClient
          .from("organizations")
          .select("credit_balance")
          .eq("id", organizationId)
          .single();

        if (currentOrg) {
          const newBalance = (currentOrg.credit_balance || 0) + monthlyCredits;
          await adminClient
            .from("organizations")
            .update({ credit_balance: newBalance, updated_at: new Date().toISOString() })
            .eq("id", organizationId);

          // Also sync to parent's personal balance (mirrored)
          const { data: parentMember } = await adminClient
            .from("organization_members")
            .select("user_id")
            .eq("organization_id", organizationId)
            .eq("role", "owner")
            .single();

          if (parentMember) {
            await adminClient
              .from("profiles")
              .update({ credits_balance: newBalance })
              .eq("id", parentMember.user_id);
          }

          // Log the trial credit transaction
          await adminClient.from("organization_transactions").insert({
            organization_id: organizationId,
            type: "purchase",
            amount: monthlyCredits,
            description: `Credits inclus - debut essai Mifa (${childCount} enfant${childCount > 1 ? "s" : ""} x ${creditsPerChild}€)`,
          });

          console.log(`Added ${monthlyCredits}EUR trial credits to mifa org ${organizationId}`);
        }
      }
    }
  }
}

/**
 * Handle subscription canceled
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const { organizationId } = metadata;

  console.log("Subscription canceled:", { organizationId });

  if (!organizationId) {
    console.error("Missing organizationId in subscription metadata");
    return;
  }

  const adminClient = createAdminClient();

  // Update organization subscription status
  const { error } = await adminClient
    .from("organizations")
    .update({
      subscription_status: "canceled",
      subscription_canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (error) {
    console.error("Error updating organization subscription:", error);
    return;
  }

  // Log subscription event
  await adminClient
    .from("organization_subscription_events")
    .insert({
      organization_id: organizationId,
      event_type: "subscription_canceled",
      stripe_subscription_id: subscription.id,
      previous_plan_id: metadata.planId,
    });

  console.log(`Subscription canceled for organization ${organizationId}`);

  // Send cancellation email
  const { data: org } = await adminClient
    .from("organizations")
    .select("name, contact_email")
    .eq("id", organizationId)
    .single();

  if (org?.contact_email) {
    await sendSubscriptionEmail(
      org.contact_email,
      org.name,
      metadata.planId || "unknown",
      "canceled"
    );
  }
}

/**
 * Handle successful subscription payment
 */
async function handleSubscriptionPayment(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) return;

  // Get subscription to find org
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) return;

  const adminClient = createAdminClient();

  // Log payment event
  await adminClient
    .from("organization_subscription_events")
    .insert({
      organization_id: organizationId,
      event_type: "payment_succeeded",
      stripe_subscription_id: subscriptionId,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.number,
      },
    });

  console.log(`Subscription payment succeeded for organization ${organizationId}: ${(invoice.amount_paid || 0) / 100} ${invoice.currency}`);

  // Mifa plan: reset subscription credits and preserve purchased credits
  if (subscription.metadata?.type === "mifa") {
    // Compute total children from subscription line items
    const creditsPerChild = parseFloat(subscription.metadata?.creditsPerChild || "5");
    let totalChildren = parseInt(subscription.metadata?.childCount || "1", 10);

    // Try to get accurate count from subscription items
    if (subscription.items?.data) {
      totalChildren = subscription.items.data.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      );
    }

    const subscriptionCredits = creditsPerChild * totalChildren;

    if (subscriptionCredits > 0) {
      const { data: org } = await adminClient
        .from("organizations")
        .select("credit_balance, purchased_credits")
        .eq("id", organizationId)
        .single();

      if (org) {
        // Cap purchased_credits to current balance (can't exceed what's left)
        const purchasedCredits = Math.min(
          org.purchased_credits || 0,
          org.credit_balance || 0
        );
        // New balance = preserved purchased credits + fresh subscription credits
        const newBalance = purchasedCredits + subscriptionCredits;

        await adminClient
          .from("organizations")
          .update({
            credit_balance: newBalance,
            purchased_credits: purchasedCredits,
            updated_at: new Date().toISOString(),
          })
          .eq("id", organizationId);

        // Sync parent's personal balance (mirrored with org)
        const { data: parentMember } = await adminClient
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", organizationId)
          .eq("role", "owner")
          .single();

        if (parentMember) {
          await adminClient
            .from("profiles")
            .update({ credits_balance: newBalance })
            .eq("id", parentMember.user_id);
        }

        // Log the credit transaction
        await adminClient.from("organization_transactions").insert({
          organization_id: organizationId,
          type: "purchase",
          amount: subscriptionCredits,
          description: `Credits mensuels Mifa (${totalChildren} enfant${totalChildren > 1 ? "s" : ""} x ${creditsPerChild}€)`,
          stripe_payment_id: invoice.payment_intent as string,
        });

        console.log(`Reset credits for mifa org ${organizationId}: ${subscriptionCredits}€ subscription + ${purchasedCredits}€ purchased = ${newBalance}€ total`);
      }
    }
  }
}

/**
 * Handle failed subscription payment
 */
async function handleSubscriptionPaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) return;

  // Get subscription to find org
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) return;

  const adminClient = createAdminClient();

  // Update subscription status to past_due
  await adminClient
    .from("organizations")
    .update({
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  // Log payment failed event
  await adminClient
    .from("organization_subscription_events")
    .insert({
      organization_id: organizationId,
      event_type: "payment_failed",
      stripe_subscription_id: subscriptionId,
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency,
      metadata: {
        invoice_id: invoice.id,
        attempt_count: invoice.attempt_count,
      },
    });

  console.log(`Subscription payment failed for organization ${organizationId}`);

  // Send payment failed email
  const { data: org } = await adminClient
    .from("organizations")
    .select("name, contact_email")
    .eq("id", organizationId)
    .single();

  if (org?.contact_email) {
    await sendSubscriptionEmail(
      org.contact_email,
      org.name,
      subscription.metadata?.planId || "unknown",
      "payment_failed"
    );
  }
}

/**
 * Build HTML email for Mifa invite (used by webhook for pending invites)
 */
function buildMifaInviteEmail(
  name: string,
  familyName: string,
  inviteUrl: string,
  isChild: boolean
): string {
  if (isChild) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #0ea5e9, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">Mifa by iaiaz</h1>
  </div>
  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Hey ${name} !</h2>
  <p style="margin-bottom: 16px;">Tes parents t'invitent a rejoindre <strong>${familyName}</strong> sur iaiaz.</p>
  <p style="margin-bottom: 16px;">Tu vas pouvoir utiliser l'IA pour tes devoirs, tes projets creatifs, et apprendre plein de nouvelles choses !</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #d946ef); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 18px;">Rejoindre ma famille</a>
  </div>
  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">L'equipe iaiaz</p>
</body></html>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 32px; font-weight: 800; color: #0ea5e9; margin: 0;">Mifa by iaiaz</h1>
  </div>
  <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 16px;">Bonjour ${name},</h2>
  <p style="margin-bottom: 16px;">Vous etes invite(e) a rejoindre <strong>${familyName}</strong> sur iaiaz Mifa en tant que parent.</p>
  <p style="margin-bottom: 16px;">Vous aurez acces au tableau de bord parental, aux controles et au suivi de l'utilisation de l'IA par votre famille.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #2563eb); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Rejoindre la famille</a>
  </div>
  <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">L'equipe iaiaz</p>
</body></html>`;
}
