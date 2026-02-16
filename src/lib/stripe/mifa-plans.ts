// Mifa by iaiaz - Per-child pricing configuration
// Credits are in EUR, consistent with the existing credit system
// Pricing: €9.90/child/month for first 2, €5.00/child/month for 3rd+
// Each child includes €5 AI credits. Seat fee is €4.90 (waived from 3rd child).

export const MIFA_PLAN = {
  id: "mifa",
  name: "mifa",
  priceId: process.env.STRIPE_MIFA_PRICE_ID || "",
  extraChildPriceId: process.env.STRIPE_MIFA_EXTRA_CHILD_PRICE_ID || "",
  pricePerChild: 9.9, // EUR per month for first 2 children
  pricePerExtraChild: 5.0, // EUR per month for 3rd+ children (credits only, no seat fee)
  creditsPerChild: 5.0, // EUR of AI credits per child per month
  maxPaidSeats: 2, // 3rd+ children only pay for credits
};

export const CREDIT_TOP_UPS = {
  small: { price: 5.0, credits: 5.0 },
  medium: { price: 10.0, credits: 10.0 },
  large: { price: 20.0, credits: 20.0 },
} as const;

export function calculateMifaPrice(childCount: number): {
  total: number;
  paidSeats: number;
  extraChildren: number;
  breakdown: { label: string; quantity: number; unitPrice: number; subtotal: number }[];
} {
  const paidSeats = Math.min(childCount, MIFA_PLAN.maxPaidSeats);
  const extraChildren = Math.max(0, childCount - MIFA_PLAN.maxPaidSeats);

  const breakdown: { label: string; quantity: number; unitPrice: number; subtotal: number }[] = [];

  if (paidSeats > 0) {
    breakdown.push({
      label: "child",
      quantity: paidSeats,
      unitPrice: MIFA_PLAN.pricePerChild,
      subtotal: paidSeats * MIFA_PLAN.pricePerChild,
    });
  }

  if (extraChildren > 0) {
    breakdown.push({
      label: "extraChild",
      quantity: extraChildren,
      unitPrice: MIFA_PLAN.pricePerExtraChild,
      subtotal: extraChildren * MIFA_PLAN.pricePerExtraChild,
    });
  }

  const total = breakdown.reduce((sum, item) => sum + item.subtotal, 0);

  return { total, paidSeats, extraChildren, breakdown };
}
