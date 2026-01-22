import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { ORG_CREDIT_PACKS, calculateOrgDiscount } from "@/lib/models";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const MIN_CUSTOM_AMOUNT = 50;
const MAX_CUSTOM_AMOUNT = 2000;

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
          credit_balance
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

    const org = membership.organization as unknown as { id: string; name: string; credit_balance: number };
    if (!org) {
      return NextResponse.json(
        { error: "Organisation introuvable" },
        { status: 404 }
      );
    }

    // Parse request
    const body = await request.json();
    const { packId, customAmount } = body;

    let productName: string;
    let productDescription: string;
    let priceInCents: number;
    let credits: number;
    let discount: number;

    if (customAmount !== undefined) {
      // Custom amount
      const amount = parseInt(customAmount, 10);

      if (isNaN(amount) || amount < MIN_CUSTOM_AMOUNT || amount > MAX_CUSTOM_AMOUNT) {
        return NextResponse.json(
          { error: `Le montant doit être entre ${MIN_CUSTOM_AMOUNT}€ et ${MAX_CUSTOM_AMOUNT}€` },
          { status: 400 }
        );
      }

      // Calculate discount for custom amounts
      const discountResult = calculateOrgDiscount(amount);
      credits = amount;
      priceInCents = discountResult.price * 100;
      discount = discountResult.discount;

      productName = `iaiaz - ${credits}€ de crédits pour ${org.name}`;
      productDescription = discount > 0
        ? `${credits}€ de crédits organisation (-${discount}%)`
        : `${credits}€ de crédits organisation`;
    } else if (packId) {
      // Predefined org pack
      const pack = ORG_CREDIT_PACKS.find((p) => p.id === packId);
      if (!pack) {
        return NextResponse.json(
          { error: "Pack invalide" },
          { status: 400 }
        );
      }

      productName = `iaiaz - Pack ${pack.name} pour ${org.name}`;
      productDescription = `${pack.credits}€ de crédits pour votre organisation`;
      priceInCents = pack.price * 100;
      credits = pack.credits;
      discount = pack.discount;
    } else {
      return NextResponse.json(
        { error: "Veuillez sélectionner un montant" },
        { status: 400 }
      );
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/org/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/org/credits`,
      customer_email: user.email,
      metadata: {
        type: "organization", // Flag to differentiate from personal purchases
        userId: user.id,
        organizationId: org.id,
        organizationName: org.name,
        packId: packId || "custom",
        credits: credits.toString(),
        discount: discount.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe org checkout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}
