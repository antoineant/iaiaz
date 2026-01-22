import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "view_user_data"
  | "export_user_data"
  | "delete_user"
  | "modify_user_credits"
  | "view_conversations"
  | "access_analytics"
  | "auto_cleanup_conversations"
  | "manual_data_access";

interface AuditLogEntry {
  adminUserId: string;
  action: AuditAction | string;
  targetTable: string;
  targetId?: string;
  targetUserId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an admin action for audit purposes.
 * This should be called whenever an admin accesses or modifies sensitive user data.
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    const adminClient = createAdminClient();

    await adminClient.from("admin_audit_log").insert({
      admin_user_id: entry.adminUserId,
      action: entry.action,
      target_table: entry.targetTable,
      target_id: entry.targetId || null,
      target_user_id: entry.targetUserId || null,
      details: entry.details || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    console.error("Failed to log admin action:", error);
  }
}

/**
 * Get recent audit logs for admin dashboard
 */
export async function getAuditLogs(
  limit: number = 100,
  offset: number = 0,
  filters?: {
    adminUserId?: string;
    action?: string;
    targetUserId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  logs: Array<{
    id: string;
    admin_user_id: string;
    admin_email?: string;
    action: string;
    target_table: string;
    target_id: string | null;
    target_user_id: string | null;
    target_email?: string;
    details: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
  }>;
  total: number;
}> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("admin_audit_log")
    .select(`
      id,
      admin_user_id,
      action,
      target_table,
      target_id,
      target_user_id,
      details,
      ip_address,
      created_at
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.adminUserId) {
    query = query.eq("admin_user_id", filters.adminUserId);
  }
  if (filters?.action) {
    query = query.eq("action", filters.action);
  }
  if (filters?.targetUserId) {
    query = query.eq("target_user_id", filters.targetUserId);
  }
  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate.toISOString());
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Failed to fetch audit logs:", error);
    return { logs: [], total: 0 };
  }

  return {
    logs: data || [],
    total: count || 0,
  };
}

/**
 * Helper to extract IP address from request headers
 */
export function getClientIP(headers: Headers): string | undefined {
  // Try various headers that might contain the client IP
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") || // Cloudflare
    undefined
  );
}
