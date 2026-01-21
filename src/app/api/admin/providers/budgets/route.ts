import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// GET /api/admin/providers/budgets - Get all provider budgets
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("provider_budgets")
    .select("*")
    .order("provider");

  if (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }

  return NextResponse.json({ budgets: data || [] });
}

// PUT /api/admin/providers/budgets - Update a provider budget
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const body = await request.json();
  const {
    provider,
    monthly_budget_eur,
    alert_threshold_50,
    alert_threshold_75,
    alert_threshold_90,
    alert_threshold_100,
    notes,
  } = body;

  if (!provider) {
    return NextResponse.json(
      { error: "Provider is required" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};

  if (monthly_budget_eur !== undefined) {
    updateData.monthly_budget_eur = monthly_budget_eur;
  }
  if (alert_threshold_50 !== undefined) {
    updateData.alert_threshold_50 = alert_threshold_50;
  }
  if (alert_threshold_75 !== undefined) {
    updateData.alert_threshold_75 = alert_threshold_75;
  }
  if (alert_threshold_90 !== undefined) {
    updateData.alert_threshold_90 = alert_threshold_90;
  }
  if (alert_threshold_100 !== undefined) {
    updateData.alert_threshold_100 = alert_threshold_100;
  }
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const { data, error } = await supabase
    .from("provider_budgets")
    .update(updateData)
    .eq("provider", provider)
    .select()
    .single();

  if (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }

  return NextResponse.json({ budget: data });
}

// POST /api/admin/providers/budgets - Update manual balance
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const body = await request.json();
  const { provider, manual_balance_eur } = body;

  if (!provider) {
    return NextResponse.json(
      { error: "Provider is required" },
      { status: 400 }
    );
  }

  if (manual_balance_eur === undefined) {
    return NextResponse.json(
      { error: "manual_balance_eur is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("provider_budgets")
    .update({
      manual_balance_eur,
      manual_balance_updated_at: new Date().toISOString(),
    })
    .eq("provider", provider)
    .select()
    .single();

  if (error) {
    console.error("Error updating manual balance:", error);
    return NextResponse.json(
      { error: "Failed to update manual balance" },
      { status: 500 }
    );
  }

  return NextResponse.json({ budget: data });
}
