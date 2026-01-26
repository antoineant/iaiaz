import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/org/credits/transfer - Transfer credits between personal and organization
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { direction, amount, note } = body;

    // Validate direction
    if (!direction || !["to_org", "to_personal"].includes(direction)) {
      return NextResponse.json(
        { error: "Invalid direction. Must be 'to_org' or 'to_personal'" },
        { status: 400 }
      );
    }

    // Validate amount
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Get user's organization membership
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        can_manage_credits,
        organization_id,
        organizations (
          id,
          name,
          type,
          credit_balance,
          credit_allocated
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Not a member of any organization" },
        { status: 403 }
      );
    }

    const org = membership.organizations as unknown as {
      id: string;
      name: string;
      type: string;
      credit_balance: number;
      credit_allocated: number;
    };

    // Check permission to transfer credits
    const canTransfer = checkCanTransferCredits(
      membership.role,
      membership.can_manage_credits,
      org.type
    );

    if (!canTransfer) {
      return NextResponse.json(
        {
          error:
            "You don't have permission to transfer credits. Contact your organization admin.",
        },
        { status: 403 }
      );
    }

    // Get current personal balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Failed to get user profile" },
        { status: 500 }
      );
    }

    const personalBalance = profile.credits_balance || 0;
    const orgBalance = org.credit_balance || 0;
    const orgAllocated = org.credit_allocated || 0;
    const orgAvailable = orgBalance - orgAllocated;

    // Validate sufficient balance
    if (direction === "to_org" && personalBalance < transferAmount) {
      return NextResponse.json(
        {
          error: "Insufficient personal credits",
          available: personalBalance,
          requested: transferAmount,
        },
        { status: 400 }
      );
    }

    if (direction === "to_personal" && orgAvailable < transferAmount) {
      return NextResponse.json(
        {
          error: "Insufficient organization credits",
          available: orgAvailable,
          requested: transferAmount,
        },
        { status: 400 }
      );
    }

    // Calculate new balances
    let newPersonalBalance: number;
    let newOrgBalance: number;

    if (direction === "to_org") {
      newPersonalBalance = personalBalance - transferAmount;
      newOrgBalance = orgBalance + transferAmount;
    } else {
      newPersonalBalance = personalBalance + transferAmount;
      newOrgBalance = orgBalance - transferAmount;
    }

    // Perform the transfer using admin client for atomic updates
    // Update personal balance
    const { error: personalUpdateError } = await adminClient
      .from("profiles")
      .update({
        credits_balance: newPersonalBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (personalUpdateError) {
      console.error("Error updating personal balance:", personalUpdateError);
      return NextResponse.json(
        { error: "Failed to update personal balance" },
        { status: 500 }
      );
    }

    // Update organization balance
    const { error: orgUpdateError } = await adminClient
      .from("organizations")
      .update({
        credit_balance: newOrgBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", org.id);

    if (orgUpdateError) {
      console.error("Error updating organization balance:", orgUpdateError);
      // Try to rollback personal balance
      await adminClient
        .from("profiles")
        .update({ credits_balance: personalBalance })
        .eq("id", user.id);
      return NextResponse.json(
        { error: "Failed to update organization balance" },
        { status: 500 }
      );
    }

    // Record the transfer
    await adminClient.from("credit_transfers").insert({
      user_id: user.id,
      organization_id: org.id,
      direction,
      amount: transferAmount,
      personal_balance_after: newPersonalBalance,
      org_balance_after: newOrgBalance,
      note: note?.trim() || null,
    });

    // Log to organization_transactions
    await adminClient.from("organization_transactions").insert({
      organization_id: org.id,
      user_id: user.id,
      type: direction === "to_org" ? "transfer_in" : "transfer_out",
      amount: direction === "to_org" ? transferAmount : -transferAmount,
      description:
        direction === "to_org"
          ? "Transfert depuis les crédits personnels"
          : "Transfert vers les crédits personnels",
    });

    return NextResponse.json({
      success: true,
      personal_balance: newPersonalBalance,
      org_balance: newOrgBalance,
      org_available: newOrgBalance - orgAllocated,
      transferred: transferAmount,
      direction,
    });
  } catch (error) {
    console.error("Credit transfer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/org/credits/transfer - Check if user can transfer and get balances
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization membership
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        can_manage_credits,
        organization_id,
        organizations (
          id,
          name,
          type,
          credit_balance,
          credit_allocated
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({
        can_transfer: false,
        reason: "not_member",
      });
    }

    const org = membership.organizations as unknown as {
      id: string;
      name: string;
      type: string;
      credit_balance: number;
      credit_allocated: number;
    };

    // Get personal balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", user.id)
      .single();

    const canTransfer = checkCanTransferCredits(
      membership.role,
      membership.can_manage_credits,
      org.type
    );

    const orgAvailable = (org.credit_balance || 0) - (org.credit_allocated || 0);

    return NextResponse.json({
      can_transfer: canTransfer,
      reason: canTransfer ? null : "no_permission",
      personal_balance: profile?.credits_balance || 0,
      org_balance: org.credit_balance || 0,
      org_allocated: org.credit_allocated || 0,
      org_available: orgAvailable,
      org_name: org.name,
      org_type: org.type,
      role: membership.role,
    });
  } catch (error) {
    console.error("Credit transfer check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to check transfer permission
function checkCanTransferCredits(
  role: string,
  canManageCredits: boolean,
  orgType: string
): boolean {
  // Owners and admins can always transfer
  if (role === "owner" || role === "admin") {
    return true;
  }

  // For training_center (self-employed trainers), only owner can transfer
  // (already covered above, but being explicit)
  if (orgType === "training_center") {
    return role === "owner";
  }

  // For other org types, check the can_manage_credits permission
  return canManageCredits === true;
}
