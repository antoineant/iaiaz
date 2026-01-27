import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, getCurrentAdminUser } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Adjust organization credits
export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orgId } = await params;
  const supabase = await createClient();
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

    // Get current organization (use adminClient to bypass RLS)
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .select("id, name, credit_balance")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Calculate new balance
    const currentBalance = org.credit_balance || 0;
    const newBalance = Math.max(0, currentBalance + creditAmount);

    // Update organization credit balance
    const { error: updateError } = await adminClient
      .from("organizations")
      .update({
        credit_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) {
      console.error("Error updating organization credits:", updateError);
      return NextResponse.json(
        { error: "Failed to update credits" },
        { status: 500 }
      );
    }

    // Get admin user ID for audit trail
    const adminUser = await getCurrentAdminUser();

    // Log the transaction (type must be one of: purchase, allocation, usage, refund, adjustment)
    await adminClient.from("organization_transactions").insert({
      organization_id: orgId,
      type: "adjustment",
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
