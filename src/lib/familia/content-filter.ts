// Content filtering for Familia - leverages provider-level safety
// No keyword lists: AI providers handle moderation, we surface it to parents

import { createAdminClient } from "@/lib/supabase/admin";

export type FlagType = "content_policy" | "parent_review" | "excessive_usage";

/**
 * Check pre-conditions before allowing a chat message (quiet hours, daily limits)
 * Called from the chat API route for family org members
 */
export async function checkFamiliaPreConditions(
  userId: string
): Promise<{ allowed: boolean; reason?: string; detail?: string }> {
  const adminClient = createAdminClient();

  const { data: result } = await adminClient.rpc("check_familia_preconditions", {
    p_user_id: userId,
  });

  if (!result) {
    return { allowed: true };
  }

  if (result.allowed === false) {
    if (result.reason === "quiet_hours") {
      return {
        allowed: false,
        reason: "quiet_hours",
        detail: `L'utilisation de l'IA est suspendue jusqu'a ${result.quiet_hours_end}`,
      };
    }
    if (result.reason === "daily_limit_reached") {
      return {
        allowed: false,
        reason: "daily_limit",
        detail: "Tu as atteint ta limite de crédits. Demande à tes parents pour en avoir plus !",
      };
    }
    if (result.reason === "trial_expired") {
      return {
        allowed: false,
        reason: "trial_expired",
        detail: "La période d'essai est terminée. Demande à tes parents de s'abonner !",
      };
    }
  }

  return { allowed: true };
}

/**
 * Log a content flag for parental review
 * Called when a content_policy error is caught or parent manually flags
 */
export async function logContentFlag(
  conversationId: string | null,
  userId: string,
  orgId: string,
  flagType: FlagType,
  reason: string
): Promise<void> {
  const adminClient = createAdminClient();

  await adminClient.from("conversation_flags").insert({
    conversation_id: conversationId,
    user_id: userId,
    organization_id: orgId,
    flag_type: flagType,
    flag_reason: reason,
  });
}

/**
 * Check if a user is in a family org and get their org info
 */
export async function getFamilyOrgInfo(
  userId: string
): Promise<{ isFamilyMember: boolean; orgId?: string; role?: string } | null> {
  const adminClient = createAdminClient();

  const { data: membership } = await adminClient
    .from("organization_members")
    .select(`
      id,
      role,
      organization:organizations (
        id,
        type
      )
    `)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!membership) return { isFamilyMember: false };

  const org = membership.organization as unknown as { id: string; type: string } | null;
  if (!org || org.type !== "family") return { isFamilyMember: false };

  return {
    isFamilyMember: true,
    orgId: org.id,
    role: membership.role,
  };
}
