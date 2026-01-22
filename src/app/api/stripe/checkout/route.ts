import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { CREDIT_PACKS } from "@/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const MIN_CUSTOM_AMOUNT = 1;
const MAX_CUSTOM_AMOUNT = 100;

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

    // Parse request
    const body = await request.json();
    const { packId, customAmount } = body;

    let productName: string;
    let productDescription: string;
    let priceInCents: number;
    let credits: number;

    if (customAmount !== undefined) {
      // Custom amount
      const amount = parseInt(customAmount, 10);

      if (isNaN(amount) || amount < MIN_CUSTOM_AMOUNT || amount > MAX_CUSTOM_AMOUNT) {
        return NextResponse.json(
          { error: `Le montant doit être entre ${MIN_CUSTOM_AMOUNT}€ et ${MAX_CUSTOM_AMOUNT}€` },
          { status: 400 }
        );
      }

      productName = `iaiaz - ${amount}€ de crédits`;
      productDescription = `${amount}€ de crédits pour utiliser les modèles IA`;
      priceInCents = amount * 100;
      credits = amount;
    } else if (packId) {
      // Predefined pack
      const pack = CREDIT_PACKS.find((p) => p.id === packId);
      if (!pack) {
        return NextResponse.json(
          { error: "Pack invalide" },
          { status: 400 }
        );
      }

      productName = `iaiaz - Pack ${pack.name}`;
      productDescription = `${pack.credits}€ de crédits pour utiliser les modèles IA`;
      priceInCents = pack.price * 100;
      credits = pack.credits;
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        packId: packId || "custom",
        credits: credits.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}
