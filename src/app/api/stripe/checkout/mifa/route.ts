import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FAMILIA_PLAN } from "@/lib/stripe/mifa-plans";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await request.json();
    const { childCount, organizationId } = body as {
      childCount: number;
      organizationId: string;
    };

    if (!childCount || childCount < 1) {
      return NextResponse.json({ error: "Nombre d'enfants invalide" }, { status: 400 });
    }

    if (!FAMILIA_PLAN.priceId) {
      return NextResponse.json(
        { error: "Prix Stripe non configure pour ce plan" },
        { status: 500 }
      );
    }

    // Verify user owns this family org
    const { data: membership } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        organization:organizations (id, type, subscription_status, subscription_stripe_customer_id)
      `)
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Vous devez etre parent de cette famille" },
        { status: 403 }
      );
    }

    const org = membership.organization as unknown as {
      id: string;
      type: string;
      subscription_status: string;
      subscription_stripe_customer_id: string | null;
    };

    if (org.type !== "family") {
      return NextResponse.json(
        { error: "Cette organisation n'est pas un plan Mifa" },
        { status: 400 }
      );
    }

    if (org.subscription_status === "active") {
      return NextResponse.json(
        { error: "Vous avez deja un abonnement actif" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId = org.subscription_stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          organizationId: org.id,
          type: "mifa",
        },
      });
      customerId = customer.id;

      const adminClient = createAdminClient();
      await adminClient
        .from("organizations")
        .update({ subscription_stripe_customer_id: customerId })
        .eq("id", org.id);
    }

    // Build line items: first 2 children at full price, 3rd+ at credits-only price
    const paidSeats = Math.min(childCount, FAMILIA_PLAN.maxPaidSeats);
    const extraChildren = Math.max(0, childCount - FAMILIA_PLAN.maxPaidSeats);

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: FAMILIA_PLAN.priceId,
        quantity: paidSeats,
      },
    ];

    if (extraChildren > 0 && FAMILIA_PLAN.extraChildPriceId) {
      line_items.push({
        price: FAMILIA_PLAN.extraChildPriceId,
        quantity: extraChildren,
      });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items,
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/mifa/dashboard?welcome=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/mifa/dashboard`,
      subscription_data: {
        metadata: {
          organizationId: org.id,
          type: "mifa",
          creditsPerChild: FAMILIA_PLAN.creditsPerChild.toString(),
          childCount: childCount.toString(),
        },
      },
      metadata: {
        type: "subscription",
        organizationId: org.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Mifa checkout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation du paiement" },
      { status: 500 }
    );
  }
}
