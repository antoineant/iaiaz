// Content filtering for Mifa - leverages provider-level safety
// No keyword lists: AI providers handle moderation, we surface it to parents

import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push";

export type FlagType = "content_policy" | "parent_review" | "excessive_usage";

/**
 * Check pre-conditions before allowing a chat message (quiet hours, daily limits)
 * Called from the chat API route for family org members
 */
export async function checkMifaPreConditions(
  userId: string
): Promise<{ allowed: boolean; reason?: string; detail?: string }> {
  const adminClient = createAdminClient();

  const { data: result } = await adminClient.rpc("check_mifa_preconditions", {
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

  // Notify parents if notification_on_flagged_content is enabled
  try {
    const { data: controls } = await adminClient
      .from("parental_controls")
      .select("notification_on_flagged_content")
      .eq("organization_id", orgId)
      .eq("child_user_id", userId)
      .single();

    if (controls?.notification_on_flagged_content !== false) {
      // Get child name
      const { data: childProfile } = await adminClient
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();

      const childName = childProfile?.display_name || "Votre enfant";

      // Get parent IDs
      const { data: parents } = await adminClient
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgId)
        .in("role", ["owner", "admin"])
        .neq("user_id", userId);

      const parentIds = parents?.map((p) => p.user_id) || [];

      if (parentIds.length > 0) {
        sendPushToUsers(parentIds, {
          title: "Alerte contenu",
          body: `Un message de ${childName} a été bloqué par le filtre de sécurité.`,
          data: { type: "content_flag", childId: userId, flagType },
        }).catch((err) => console.error("📱 Push failed for content flag:", err));
      }
    }
  } catch {
    // Non-blocking: don't fail if notification fails
  }
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
      organization:organizations!inner (
        id,
        type
      )
    `)
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("organizations.type", "family")
    .limit(1)
    .maybeSingle();

  if (!membership) return { isFamilyMember: false };

  const org = membership.organization as unknown as { id: string; type: string } | null;
  if (!org) return { isFamilyMember: false };

  return {
    isFamilyMember: true,
    orgId: org.id,
    role: membership.role,
  };
}
