import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const { userId, packId, credits } = session.metadata || {};

    console.log("Session metadata:", { userId, packId, credits });

    if (!userId || !credits) {
      console.error("Missing metadata - userId:", userId, "credits:", credits);
      return NextResponse.json(
        { error: "Missing metadata" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Add credits to user
    const { data, error } = await adminClient.rpc("add_credits", {
      p_user_id: userId,
      p_amount: parseFloat(credits),
      p_description: `Achat pack ${packId}`,
      p_stripe_payment_id: session.payment_intent as string,
    });

    if (error) {
      console.error("Error adding credits:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to add credits", details: error.message },
        { status: 500 }
      );
    }

    console.log(`Successfully added ${credits}€ credits to user ${userId}`);
  }

  return NextResponse.json({ received: true });
}
