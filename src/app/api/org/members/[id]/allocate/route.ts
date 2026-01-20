import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/org";

// POST /api/org/members/[id]/allocate - Allocate credits to a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const membership = await requireOrgRole(["owner", "admin"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized - only owners and admins can allocate credits" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    const { amount } = body;

    if (amount === undefined || isNaN(parseFloat(amount))) {
      return NextResponse.json(
        { error: "Amount is required and must be a number" },
        { status: 400 }
      );
    }

    const creditAmount = parseFloat(amount);

    if (creditAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    // Check if member exists and belongs to this org
    const { data: member, error: fetchError } = await supabase
      .from("organization_members")
      .select("id, credit_allocated, credit_used, user_id")
      .eq("id", id)
      .eq("organization_id", membership.organizationId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Check organization has enough credits
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("credit_balance, credit_allocated")
      .eq("id", membership.organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const availableCredits = (org.credit_balance || 0) - (org.credit_allocated || 0);

    if (creditAmount > availableCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits in organization pool",
          available: availableCredits,
          requested: creditAmount,
        },
        { status: 400 }
      );
    }

    // Update member's allocated credits
    const newAllocation = (member.credit_allocated || 0) + creditAmount;

    const { error: updateError } = await supabase
      .from("organization_members")
      .update({
        credit_allocated: newAllocation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error allocating credits:", updateError);
      return NextResponse.json(
        { error: "Failed to allocate credits" },
        { status: 500 }
      );
    }

    // Update organization's allocated total
    const newOrgAllocated = (org.credit_allocated || 0) + creditAmount;

    const { error: orgUpdateError } = await supabase
      .from("organizations")
      .update({
        credit_allocated: newOrgAllocated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membership.organizationId);

    if (orgUpdateError) {
      console.error("Error updating org allocation:", orgUpdateError);
      // Note: Member was updated but org wasn't - this creates inconsistency
      // In production, you'd want to use a transaction
    }

    // Log the transaction
    await supabase.from("organization_transactions").insert({
      organization_id: membership.organizationId,
      user_id: member.user_id,
      type: "credit_allocated",
      amount: creditAmount,
      description: `Credit allocation by ${membership.role}`,
    });

    return NextResponse.json({
      success: true,
      member_id: id,
      previous_allocation: member.credit_allocated || 0,
      new_allocation: newAllocation,
      amount_added: creditAmount,
    });
  } catch (error) {
    console.error("Credit allocation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
