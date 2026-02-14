import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient(); // For updating profiles (bypasses RLS)

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is familia owner/admin
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(type, credit_balance)")
      .eq("user_id", user.id)
      .eq("organizations.type", "family")
      .single();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      return NextResponse.json(
        { error: "Not a familia owner/admin" },
        { status: 403 }
      );
    }

    const organizationId = membership.organization_id;
    const orgBalance = (membership.organizations as any)?.credit_balance || 0;

    // Parse request body
    const { transfers } = await request.json();

    if (!Array.isArray(transfers) || transfers.length === 0) {
      return NextResponse.json(
        { error: "Invalid transfers array" },
        { status: 400 }
      );
    }

    // Validate amounts
    const totalToTransfer = transfers.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    if (totalToTransfer <= 0 || totalToTransfer > orgBalance) {
      return NextResponse.json(
        { error: "Invalid transfer amount" },
        { status: 400 }
      );
    }

    // Verify all users are children in this family
    const userIds = transfers.map((t) => t.userId);
    const { data: familyMembers } = await supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .in("user_id", userIds);

    if (!familyMembers || familyMembers.length !== userIds.length) {
      return NextResponse.json(
        { error: "Invalid family members" },
        { status: 400 }
      );
    }

    // Ensure none are owners/admins (only transfer to children)
    const hasOwnerOrAdmin = familyMembers.some(
      (m) => m.role === "owner" || m.role === "admin"
    );

    if (hasOwnerOrAdmin) {
      return NextResponse.json(
        { error: "Cannot transfer to owners/admins" },
        { status: 400 }
      );
    }

    // Execute transfers
    console.log("💰 Starting credit transfers:", transfers);

    for (const transfer of transfers) {
      const { userId, amount } = transfer;

      if (amount <= 0) continue;

      // Get current balance (use admin client to bypass RLS)
      const { data: profile } = await adminClient
        .from("profiles")
        .select("credits_balance, display_name, credits_allocated")
        .eq("id", userId)
        .single();

      if (!profile) {
        console.error("❌ Profile not found for user:", userId);
        continue;
      }

      console.log(`  → ${profile.display_name}: ${profile.credits_balance}€ + ${amount}€`);

      // Increment user's personal credit balance and track total allocated (use admin client to bypass RLS)
      const newBalance = (parseFloat(profile.credits_balance) || 0) + amount;
      const currentAllocated = parseFloat(profile.credits_allocated || 0);
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({
          credits_balance: newBalance,
          credits_allocated: currentAllocated + amount, // Track total allocated for ring display
        })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Error updating user credits:", updateError);
        return NextResponse.json(
          { error: "Failed to update credits" },
          { status: 500 }
        );
      }

      console.log(`  ✓ New balance: ${newBalance}€`);
    }

    // Deduct from organization balance
    const newOrgBalance = orgBalance - totalToTransfer;
    const { error: orgUpdateError } = await supabase
      .from("organizations")
      .update({
        credit_balance: newOrgBalance,
      })
      .eq("id", organizationId);

    if (orgUpdateError) {
      console.error("Error updating org balance:", orgUpdateError);
      return NextResponse.json(
        { error: "Failed to update organization balance" },
        { status: 500 }
      );
    }

    console.log(`✓ Org balance updated: ${orgBalance}€ → ${newOrgBalance}€`);

    // Sync parent's personal balance with org balance (Familia pattern)
    const { error: parentSyncError } = await adminClient
      .from("profiles")
      .update({ credits_balance: newOrgBalance })
      .eq("id", user.id);

    if (parentSyncError) {
      console.error("⚠️ Warning: Could not sync parent balance:", parentSyncError);
      // Don't fail the request, just warn
    } else {
      console.log(`✓ Parent balance synced: ${newOrgBalance}€`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Transfer credits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
