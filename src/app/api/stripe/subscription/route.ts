import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { getSubscriptionPlan, calculateSubscriptionPrice } from "@/lib/models";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// Stripe Price IDs - these need to be created in Stripe Dashboard
// and set as environment variables
const STRIPE_PRICES = {
  "trainer-pro": {
    monthly: process.env.STRIPE_PRICE_TRAINER_MONTHLY,
    yearly: process.env.STRIPE_PRICE_TRAINER_YEARLY,
  },
  "school-seat": {
    monthly: process.env.STRIPE_PRICE_SCHOOL_SEAT_MONTHLY,
    yearly: process.env.STRIPE_PRICE_SCHOOL_SEAT_YEARLY,
  },
  "business-seat": {
    monthly: process.env.STRIPE_PRICE_BUSINESS_SEAT_MONTHLY,
    yearly: process.env.STRIPE_PRICE_BUSINESS_SEAT_YEARLY,
  },
  "business-pro": {
    monthly: process.env.STRIPE_PRICE_BUSINESS_PRO_MONTHLY,
    yearly: process.env.STRIPE_PRICE_BUSINESS_PRO_YEARLY,
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get user's organization membership (must be owner or admin)
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        organization:organizations (
          id,
          name,
          type,
          subscription_status,
          subscription_stripe_customer_id
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Vous devez être propriétaire ou administrateur d'une organisation" },
        { status: 403 }
      );
    }

    const org = membership.organization as unknown as {
      id: string;
      name: string;
      type: string;
      subscription_status: string;
      subscription_stripe_customer_id: string | null;
    };

    if (!org) {
      return NextResponse.json(
        { error: "Organisation introuvable" },
        { status: 404 }
      );
    }

    // Check if already subscribed
    if (org.subscription_status === "active" || org.subscription_status === "trialing") {
      return NextResponse.json(
        { error: "Vous avez déjà un abonnement actif. Gérez-le depuis votre tableau de bord." },
        { status: 400 }
      );
    }

    // Parse request
    const body = await request.json();
    const { planId, billingPeriod = "monthly", seatCount } = body;

    // Get plan
    const plan = getSubscriptionPlan(planId);
    if (!plan) {
      return NextResponse.json(
        { error: "Plan invalide" },
        { status: 400 }
      );
    }

    // Check account type matches plan
    const isSchool = org.type === "school" || org.type === "university" || org.type === "business_school";
    const isTrainer = org.type === "training_center";
    const isBusiness = org.type === "business";

    if (plan.accountType === "school" && !isSchool) {
      return NextResponse.json(
        { error: "Ce plan est réservé aux établissements" },
        { status: 400 }
      );
    }

    if (plan.accountType === "trainer" && !isTrainer) {
      return NextResponse.json(
        { error: "Ce plan est réservé aux formateurs" },
        { status: 400 }
      );
    }

    if (plan.accountType === "business" && !isBusiness) {
      return NextResponse.json(
        { error: "Ce plan est réservé aux entreprises" },
        { status: 400 }
      );
    }

    // Get Stripe price ID
    const priceIds = STRIPE_PRICES[planId as keyof typeof STRIPE_PRICES];
    if (!priceIds) {
      return NextResponse.json(
        { error: "Configuration de prix manquante" },
        { status: 500 }
      );
    }

    const stripePriceId = billingPeriod === "yearly" ? priceIds.yearly : priceIds.monthly;
    if (!stripePriceId) {
      return NextResponse.json(
        { error: "Prix Stripe non configuré pour cette période" },
        { status: 500 }
      );
    }

    // Calculate pricing
    const effectiveSeatCount = plan.pricingModel === "per_seat"
      ? Math.max(seatCount || 0, plan.includedSeats || 10)
      : 1;

    const pricing = calculateSubscriptionPrice(plan, effectiveSeatCount, billingPeriod);

    // Get or create Stripe customer
    let customerId = org.subscription_stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organizationId: org.id,
          organizationName: org.name,
          organizationType: org.type,
        },
      });
      customerId = customer.id;

      // Save customer ID to organization
      const adminClient = createAdminClient();
      await adminClient
        .from("organizations")
        .update({ subscription_stripe_customer_id: customerId })
        .eq("id", org.id);
    }

    // Create Stripe Checkout session for subscription
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: plan.pricingModel === "per_seat" ? effectiveSeatCount : 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/org/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/org/subscription`,
      subscription_data: {
        metadata: {
          organizationId: org.id,
          organizationName: org.name,
          planId: plan.id,
          seatCount: effectiveSeatCount.toString(),
        },
      },
      metadata: {
        type: "subscription",
        organizationId: org.id,
        planId: plan.id,
        seatCount: effectiveSeatCount.toString(),
      },
    };

    // Add trial period for new subscriptions (14 days)
    sessionParams.subscription_data!.trial_period_days = 14;

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      url: session.url,
      pricing: {
        plan: plan.name,
        seats: effectiveSeatCount,
        price: pricing.price,
        billingPeriod,
      },
    });
  } catch (error) {
    console.error("Stripe subscription checkout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'abonnement" },
      { status: 500 }
    );
  }
}

// GET: Get current subscription status
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select(`
        organization:organizations (
          id,
          name,
          subscription_plan_id,
          subscription_status,
          subscription_current_period_start,
          subscription_current_period_end,
          subscription_cancel_at_period_end,
          subscription_trial_end
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .single();

    if (!membership?.organization) {
      return NextResponse.json({ subscription: null });
    }

    const org = membership.organization as unknown as {
      id: string;
      name: string;
      subscription_plan_id: string | null;
      subscription_status: string;
      subscription_current_period_start: string | null;
      subscription_current_period_end: string | null;
      subscription_cancel_at_period_end: boolean;
      subscription_trial_end: string | null;
    };

    if (!org.subscription_plan_id || org.subscription_status === "none") {
      return NextResponse.json({ subscription: null });
    }

    const plan = getSubscriptionPlan(org.subscription_plan_id);

    return NextResponse.json({
      subscription: {
        planId: org.subscription_plan_id,
        planName: plan?.name || org.subscription_plan_id,
        status: org.subscription_status,
        currentPeriodStart: org.subscription_current_period_start,
        currentPeriodEnd: org.subscription_current_period_end,
        cancelAtPeriodEnd: org.subscription_cancel_at_period_end,
        trialEnd: org.subscription_trial_end,
        isActive: ["active", "trialing"].includes(org.subscription_status),
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'abonnement" },
      { status: 500 }
    );
  }
}
