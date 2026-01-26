// Dual credit system - Organization credits with personal fallback
// Supports user preference for credit source selection
import { createAdminClient } from "@/lib/supabase/admin";

export type CreditPreference =
  | "auto"           // Org first, personal fallback (default)
  | "org_first"      // Same as auto
  | "personal_first" // Personal first, org fallback
  | "org_only"       // Only use org credits
  | "personal_only"; // Only use personal credits

export interface CreditSource {
  source: "organization" | "personal";
  balance: number;
  orgId?: string;
  orgName?: string;
  memberId?: string;
  role?: string;
  isTrainer?: boolean;       // true for owner, admin, teacher
  preference?: CreditPreference;
  personalBalance?: number;  // Always included for org members (to show both)
  orgBalance?: number;       // Org balance when available
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
 * Get user's credit source - respects user preference
 */
export async function getUserCredits(userId: string): Promise<CreditSource> {
  const adminClient = createAdminClient();

  // Get user profile with preference
  const { data: profile } = await adminClient
    .from("profiles")
    .select("credits_balance, credit_preference")
    .eq("id", userId)
    .single();

  const personalBalance = profile?.credits_balance || 0;
  const preference = (profile?.credit_preference as CreditPreference) || "auto";

  // If preference is personal_only, skip org check
  if (preference === "personal_only") {
    return {
      source: "personal",
      balance: personalBalance,
      preference,
      personalBalance,
    };
  }

  // Check if user is in an active organization
  const { data: orgMember } = await adminClient.rpc("get_user_organization", {
    p_user_id: userId,
  });

  // No org membership - use personal
  if (!orgMember || orgMember.length === 0) {
    return {
      source: "personal",
      balance: personalBalance,
      preference,
      personalBalance,
    };
  }

  const member = orgMember[0];

  // Detect if user is a trainer (owner, admin, teacher)
  const isTrainer = member.is_trainer === true;

  // For trainers: always use org credits, skip preference check
  // Effective preference for trainers is always "org_only"
  const effectivePreference = isTrainer ? "org_only" : preference;

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

  // For trainers: orgBalance is org available pool (credit_balance - credit_allocated)
  // For students: orgBalance is their allocation remaining (credit_allocated - credit_used)
  // The database function get_user_organization already calculates this correctly as credit_remaining
  const orgBalance = member.credit_remaining;

  // Determine active source based on effective preference (trainers always use org)
  const useOrgFirst = effectivePreference === "auto" || effectivePreference === "org_first";
  const usePersonalFirst = effectivePreference === "personal_first";
  const orgOnly = effectivePreference === "org_only";

  // Determine which source to use
  let activeSource: "organization" | "personal";
  let activeBalance: number;

  if (orgOnly) {
    activeSource = "organization";
    activeBalance = orgBalance;
  } else if (usePersonalFirst) {
    // Personal first, org fallback
    if (personalBalance > 0) {
      activeSource = "personal";
      activeBalance = personalBalance;
    } else {
      activeSource = "organization";
      activeBalance = orgBalance;
    }
  } else {
    // Org first (auto, org_first)
    if (orgBalance > 0) {
      activeSource = "organization";
      activeBalance = orgBalance;
    } else {
      activeSource = "personal";
      activeBalance = personalBalance;
    }
  }

  return {
    source: activeSource,
    balance: activeBalance,
    orgId: member.organization_id,
    orgName: member.organization_name,
    memberId: member.id,
    role: member.role,
    isTrainer,
    preference: effectivePreference,
    personalBalance,
    orgBalance,
    limits: Object.keys(limits).length > 0 ? limits : undefined,
  };
}

/**
 * Check if user can spend a specific amount - respects preference
 */
export async function checkCanSpend(
  userId: string,
  amount: number
): Promise<SpendCheckResult> {
  const adminClient = createAdminClient();

  // Get user's preference and personal balance
  const { data: profile } = await adminClient
    .from("profiles")
    .select("credits_balance, credit_preference")
    .eq("id", userId)
    .single();

  const personalBalance = profile?.credits_balance || 0;
  const preference = (profile?.credit_preference as CreditPreference) || "auto";

  // Check organization limits (always check to detect trainers)
  const { data: limitCheck } = await adminClient.rpc(
    "check_org_member_limits",
    {
      p_user_id: userId,
      p_amount: amount,
    }
  );

  const isOrgMember = limitCheck && limitCheck.reason !== "not_member";
  const orgAllowed = limitCheck?.allowed === true;
  const isTrainer = limitCheck?.is_trainer === true;

  // Trainers always use org credits (no preference choice)
  if (isTrainer) {
    if (orgAllowed) {
      return { allowed: true, source: "organization" };
    }
    return {
      allowed: false,
      reason: limitCheck.reason,
      resetAt: limitCheck.resets_at,
      source: "organization",
    };
  }

  // Personal only - skip org (students only)
  if (preference === "personal_only") {
    if (personalBalance >= amount) {
      return { allowed: true, source: "personal" };
    }
    return {
      allowed: false,
      reason: "insufficient_credits",
      source: "personal",
    };
  }

  // Org only - must use org
  if (preference === "org_only") {
    if (!isOrgMember) {
      return {
        allowed: false,
        reason: "not_org_member",
        source: "organization",
      };
    }
    if (orgAllowed) {
      return { allowed: true, source: "organization" };
    }
    return {
      allowed: false,
      reason: limitCheck.reason,
      resetAt: limitCheck.resets_at,
      source: "organization",
    };
  }

  // Personal first
  if (preference === "personal_first") {
    if (personalBalance >= amount) {
      return { allowed: true, source: "personal" };
    }
    // Fallback to org
    if (isOrgMember && orgAllowed) {
      return { allowed: true, source: "organization" };
    }
    if (isOrgMember && !orgAllowed) {
      return {
        allowed: false,
        reason: limitCheck.reason,
        resetAt: limitCheck.resets_at,
        source: "organization",
      };
    }
    return {
      allowed: false,
      reason: "insufficient_credits",
      source: "personal",
    };
  }

  // Auto / org_first (default)
  if (isOrgMember) {
    if (orgAllowed) {
      return { allowed: true, source: "organization" };
    }
    // Org limit exceeded - try personal fallback
    if (personalBalance >= amount) {
      return { allowed: true, source: "personal" };
    }
    // Neither works
    return {
      allowed: false,
      reason: limitCheck.reason,
      resetAt: limitCheck.resets_at,
      source: "organization",
    };
  }

  // Not org member - use personal
  if (personalBalance >= amount) {
    return { allowed: true, source: "personal" };
  }

  return {
    allowed: false,
    reason: "insufficient_credits",
    source: "personal",
  };
}

/**
 * Deduct credits from appropriate source - respects preference
 * Trainers always use org credits (no personal fallback)
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string
): Promise<DeductResult> {
  const adminClient = createAdminClient();

  // Get user's preference
  const { data: profile } = await adminClient
    .from("profiles")
    .select("credits_balance, credit_preference")
    .eq("id", userId)
    .single();

  const preference = (profile?.credit_preference as CreditPreference) || "auto";

  // Helper to deduct from personal
  const deductPersonal = async (): Promise<DeductResult> => {
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

    const { data: updatedProfile } = await adminClient
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    return {
      success: true,
      remaining: updatedProfile?.credits_balance || 0,
      source: "personal",
    };
  };

  // Helper to deduct from org (returns is_trainer on failure)
  const deductOrg = async (): Promise<DeductResult & { isTrainer?: boolean }> => {
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

    return {
      success: false,
      error: orgResult?.reason || "Organization deduction failed",
      isTrainer: orgResult?.is_trainer === true,
    };
  };

  // Try org first for everyone (trainers must use org, others may fall back)
  const orgResult = await deductOrg();

  if (orgResult.success) {
    return {
      success: true,
      remaining: orgResult.remaining,
      source: "organization",
    };
  }

  // If trainer, no personal fallback allowed
  if (orgResult.isTrainer) {
    return {
      success: false,
      error: orgResult.error || "Insufficient organization credits",
    };
  }

  // Not a trainer - check if not an org member (use personal)
  if (orgResult.error === "not_member") {
    return deductPersonal();
  }

  // Student with preference-based fallback logic
  if (preference === "personal_only") {
    return deductPersonal();
  }

  if (preference === "org_only") {
    return {
      success: false,
      error: orgResult.error || "Insufficient organization credits",
    };
  }

  // Auto, org_first, personal_first - try personal as fallback
  const personalResult = await deductPersonal();
  if (personalResult.success) {
    return personalResult;
  }

  return {
    success: false,
    error: orgResult.error || "Credit deduction failed",
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
