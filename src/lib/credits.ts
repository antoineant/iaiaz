// Dual credit system - Organization credits with personal fallback
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreditSource {
  source: "organization" | "personal";
  balance: number;
  orgId?: string;
  orgName?: string;
  memberId?: string;
  role?: string;
  limits?: {
    daily?: { used: number; limit: number; remaining: number };
    weekly?: { used: number; limit: number; remaining: number };
    monthly?: { used: number; limit: number; remaining: number };
  };
}

export interface SpendCheckResult {
  allowed: boolean;
  reason?: string;
  resetAt?: string;
  source?: "organization" | "personal";
}

export interface DeductResult {
  success: boolean;
  error?: string;
  remaining?: number;
  source?: "organization" | "personal";
}

/**
 * Get user's credit source - organization first, then personal
 */
export async function getUserCredits(userId: string): Promise<CreditSource> {
  const adminClient = createAdminClient();

  // First check if user is in an active organization
  const { data: orgMember } = await adminClient.rpc("get_user_organization", {
    p_user_id: userId,
  });

  if (orgMember && orgMember.length > 0) {
    const member = orgMember[0];

    // Get organization settings for limits
    const { data: org } = await adminClient
      .from("organizations")
      .select("settings")
      .eq("id", member.organization_id)
      .single();

    const settings = org?.settings || {};
    const limits: CreditSource["limits"] = {};

    // Calculate limit usage if limits are set
    if (settings.daily_limit_per_student) {
      const { data: dailyUsage } = await adminClient
        .from("organization_transactions")
        .select("amount")
        .eq("member_id", member.id)
        .eq("type", "usage")
        .gte("created_at", new Date().toISOString().split("T")[0]);

      const dailyUsed = dailyUsage?.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      ) || 0;

      limits.daily = {
        used: dailyUsed,
        limit: settings.daily_limit_per_student,
        remaining: Math.max(0, settings.daily_limit_per_student - dailyUsed),
      };
    }

    if (settings.weekly_limit_per_student) {
      const weekStart = getWeekStart();
      const { data: weeklyUsage } = await adminClient
        .from("organization_transactions")
        .select("amount")
        .eq("member_id", member.id)
        .eq("type", "usage")
        .gte("created_at", weekStart.toISOString());

      const weeklyUsed = weeklyUsage?.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      ) || 0;

      limits.weekly = {
        used: weeklyUsed,
        limit: settings.weekly_limit_per_student,
        remaining: Math.max(0, settings.weekly_limit_per_student - weeklyUsed),
      };
    }

    if (settings.monthly_limit_per_student) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthlyUsage } = await adminClient
        .from("organization_transactions")
        .select("amount")
        .eq("member_id", member.id)
        .eq("type", "usage")
        .gte("created_at", monthStart.toISOString());

      const monthlyUsed = monthlyUsage?.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      ) || 0;

      limits.monthly = {
        used: monthlyUsed,
        limit: settings.monthly_limit_per_student,
        remaining: Math.max(0, settings.monthly_limit_per_student - monthlyUsed),
      };
    }

    return {
      source: "organization",
      balance: member.credit_remaining,
      orgId: member.organization_id,
      orgName: member.organization_name,
      memberId: member.id,
      role: member.role,
      limits: Object.keys(limits).length > 0 ? limits : undefined,
    };
  }

  // Fallback to personal credits
  const { data: profile } = await adminClient
    .from("profiles")
    .select("credits_balance")
    .eq("id", userId)
    .single();

  return {
    source: "personal",
    balance: profile?.credits_balance || 0,
  };
}

/**
 * Check if user can spend a specific amount
 */
export async function checkCanSpend(
  userId: string,
  amount: number
): Promise<SpendCheckResult> {
  const adminClient = createAdminClient();

  // Check organization limits first
  const { data: limitCheck } = await adminClient.rpc(
    "check_org_member_limits",
    {
      p_user_id: userId,
      p_amount: amount,
    }
  );

  if (limitCheck) {
    if (limitCheck.allowed) {
      return { allowed: true, source: "organization" };
    }

    // Check specific reason
    if (limitCheck.reason === "not_member") {
      // Not an org member, check personal credits
      const { data: profile } = await adminClient
        .from("profiles")
        .select("credits_balance")
        .eq("id", userId)
        .single();

      if ((profile?.credits_balance || 0) >= amount) {
        return { allowed: true, source: "personal" };
      }

      return {
        allowed: false,
        reason: "insufficient_credits",
        source: "personal",
      };
    }

    // Org limit exceeded
    return {
      allowed: false,
      reason: limitCheck.reason,
      resetAt: limitCheck.resets_at,
      source: "organization",
    };
  }

  // Fallback - check personal
  const { data: profile } = await adminClient
    .from("profiles")
    .select("credits_balance")
    .eq("id", userId)
    .single();

  if ((profile?.credits_balance || 0) >= amount) {
    return { allowed: true, source: "personal" };
  }

  return {
    allowed: false,
    reason: "insufficient_credits",
    source: "personal",
  };
}

/**
 * Deduct credits from appropriate source
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string
): Promise<DeductResult> {
  const adminClient = createAdminClient();

  // Try organization deduction first
  const { data: orgResult } = await adminClient.rpc("record_org_member_usage", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (orgResult?.success) {
    return {
      success: true,
      remaining: orgResult.remaining,
      source: "organization",
    };
  }

  // If not org member or org failed, try personal deduction
  if (!orgResult || orgResult.reason === "not_member") {
    const { data: deductResult, error } = await adminClient.rpc(
      "deduct_credits",
      {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
      }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    if (deductResult === false) {
      return { success: false, error: "Insufficient credits" };
    }

    // Get remaining balance
    const { data: profile } = await adminClient
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    return {
      success: true,
      remaining: profile?.credits_balance || 0,
      source: "personal",
    };
  }

  // Org deduction failed for another reason (limit exceeded, etc.)
  return {
    success: false,
    error: orgResult.reason || "Credit deduction failed",
  };
}

/**
 * Get effective balance for display (considers limits)
 */
export function getEffectiveBalance(credits: CreditSource): number {
  if (credits.source === "personal") {
    return credits.balance;
  }

  // For org, return the minimum of balance and any active limits
  let effectiveBalance = credits.balance;

  if (credits.limits) {
    if (credits.limits.daily) {
      effectiveBalance = Math.min(
        effectiveBalance,
        credits.limits.daily.remaining
      );
    }
    if (credits.limits.weekly) {
      effectiveBalance = Math.min(
        effectiveBalance,
        credits.limits.weekly.remaining
      );
    }
    if (credits.limits.monthly) {
      effectiveBalance = Math.min(
        effectiveBalance,
        credits.limits.monthly.remaining
      );
    }
  }

  return effectiveBalance;
}

// Helper to get start of current week (Monday)
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}
