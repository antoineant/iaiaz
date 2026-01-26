import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, getCurrentAdminUser } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Adjust user personal credits
export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId } = await params;
  const adminClient = createAdminClient();

  try {
    const body = await request.json();
    const { amount, reason } = body;

    // Validate inputs
    if (amount === undefined || isNaN(parseFloat(amount))) {
      return NextResponse.json(
        { error: "Amount is required and must be a number" },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Reason is required for audit trail" },
        { status: 400 }
      );
    }

    const creditAmount = parseFloat(amount);

    // Get current user profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email, credits_balance")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate new balance
    const currentBalance = profile.credits_balance || 0;
    const newBalance = Math.max(0, currentBalance + creditAmount);

    // Update user credit balance
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        credits_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user credits:", updateError);
      return NextResponse.json(
        { error: "Failed to update credits" },
        { status: 500 }
      );
    }

    // Get admin user ID for audit trail
    const adminUser = await getCurrentAdminUser();

    // Log the transaction
    await adminClient.from("credit_transactions").insert({
      user_id: userId,
      type: creditAmount > 0 ? "admin_credit" : "admin_debit",
      amount: creditAmount,
      description: `Admin adjustment: ${reason.trim()}`,
      metadata: {
        admin_id: adminUser?.id,
        reason: reason.trim(),
        previous_balance: currentBalance,
        new_balance: newBalance,
      },
    });

    return NextResponse.json({
      success: true,
      previous_balance: currentBalance,
      new_balance: newBalance,
      adjustment: creditAmount,
    });
  } catch (error) {
    console.error("Admin credit adjustment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
