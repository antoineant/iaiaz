import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCreditsPurchaseEmail, sendOrgCreditsPurchaseEmail } from "@/lib/email";
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // Check if this is an organization purchase
    if (metadata.type === "organization") {
      await handleOrganizationPurchase(session, metadata);
    } else {
      await handlePersonalPurchase(session, metadata);
    }
  }

  return NextResponse.json({ received: true });
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

  // Add credits to user
  const { error } = await adminClient.rpc("add_credits", {
    p_user_id: userId,
    p_amount: parseFloat(credits),
    p_description: `Achat pack ${packId}`,
    p_stripe_payment_id: session.payment_intent as string,
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

  // 2. Log the transaction in organization_transactions
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
