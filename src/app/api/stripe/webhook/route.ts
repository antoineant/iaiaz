import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCreditsPurchaseEmail, sendOrgCreditsPurchaseEmail, sendSubscriptionEmail } from "@/lib/email";
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

  // 1. Update organization credit_balance
  const { data: org, error: orgFetchError } = await adminClient
    .from("organizations")
    .select("credit_balance")
    .eq("id", organizationId)
    .single();

  if (orgFetchError || !org) {
    console.error("Error fetching organization:", orgFetchError);
    return;
  }

  const newBalance = (org.credit_balance || 0) + creditAmount;

  const { error: updateError } = await adminClient
    .from("organizations")
    .update({
      credit_balance: newBalance,
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
      .select("name, contact_email")
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
