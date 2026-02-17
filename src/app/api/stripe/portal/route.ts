import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const locale = body.locale;
    const localePrefix = locale && locale !== "fr" ? `/${locale}` : "";

    const supabase = await createClient();

    // Get user
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
          subscription_stripe_customer_id
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .single();

    if (!membership?.organization) {
      return NextResponse.json(
        { error: "Organisation introuvable" },
        { status: 404 }
      );
    }

    const org = membership.organization as unknown as {
      id: string;
      subscription_stripe_customer_id: string | null;
    };

    if (!org.subscription_stripe_customer_id) {
      return NextResponse.json(
        { error: "Aucun abonnement actif" },
        { status: 400 }
      );
    }

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.subscription_stripe_customer_id,
      locale: (locale as Stripe.BillingPortal.SessionCreateParams["locale"]) || "auto",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}${localePrefix}/org/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'accès au portail de paiement" },
      { status: 500 }
    );
  }
}
