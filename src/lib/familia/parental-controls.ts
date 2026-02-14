// Parental controls management for Familia

import { createAdminClient } from "@/lib/supabase/admin";
import type { SupervisionMode } from "./age-verification";

export interface ParentalControlSettings {
  supervision_mode: SupervisionMode;
  daily_time_limit_minutes: number | null;
  daily_credit_limit: number | null;
  cumulative_credits: boolean;
  quiet_hours_start: string | null; // "HH:MM" format
  quiet_hours_end: string | null;
}

/**
 * Get parental controls for a specific child
 */
export async function getParentalControls(
  orgId: string,
  childUserId: string
): Promise<ParentalControlSettings | null> {
  const adminClient = createAdminClient();

  const { data } = await adminClient
    .from("parental_controls")
    .select("*")
    .eq("organization_id", orgId)
    .eq("child_user_id", childUserId)
    .single();

  if (!data) return null;

  return {
    supervision_mode: data.supervision_mode as SupervisionMode,
    daily_time_limit_minutes: data.daily_time_limit_minutes,
    daily_credit_limit: data.daily_credit_limit,
    cumulative_credits: data.cumulative_credits ?? false,
    quiet_hours_start: data.quiet_hours_start,
    quiet_hours_end: data.quiet_hours_end,
  };
}

/**
 * Create or update parental controls for a child
 */
export async function upsertParentalControls(
  orgId: string,
  childUserId: string,
  settings: Partial<ParentalControlSettings>,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("parental_controls")
    .upsert(
      {
        organization_id: orgId,
        child_user_id: childUserId,
        ...settings,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,child_user_id" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  // Also update supervision_mode on organization_members for quick lookups
  if (settings.supervision_mode) {
    await adminClient
      .from("organization_members")
      .update({ supervision_mode: settings.supervision_mode })
      .eq("organization_id", orgId)
      .eq("user_id", childUserId);
  }

  return { success: true };
}

/**
 * Get all children and their controls for a family org
 */
export async function getFamilyChildrenWithControls(orgId: string) {
  const adminClient = createAdminClient();

  const { data: members } = await adminClient
    .from("organization_members")
    .select("id, user_id, display_name, role, supervision_mode, age_bracket")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .eq("role", "student");

  if (!members) return [];

  const childrenWithControls = await Promise.all(
    members.map(async (member) => {
      const controls = await getParentalControls(orgId, member.user_id);
      return {
        ...member,
        controls,
      };
    })
  );

  return childrenWithControls;
}

/**
 * Initialize default parental controls when a child joins the family
 */
export async function initializeChildControls(
  orgId: string,
  childUserId: string,
  supervisionMode: SupervisionMode,
  parentUserId: string
): Promise<void> {
  const defaults: ParentalControlSettings = {
    supervision_mode: supervisionMode,
    daily_time_limit_minutes: supervisionMode === "guided" ? 60 : null,
    daily_credit_limit: supervisionMode === "guided" ? 0.5 : 1.0,
    cumulative_credits: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
  };

  await upsertParentalControls(orgId, childUserId, defaults, parentUserId);
}
