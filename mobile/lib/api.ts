import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const DEFAULT_MODEL = "claude-sonnet-4-5";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const url = `${API_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Session expired — sign out to force re-login
        supabase.auth.signOut().catch(() => {});
      }
      throw new Error(body.error || `Request failed: ${res.status}`);
    }

    return res.json();
  } catch (err) {
    console.error(`[API] ${options.method || "GET"} ${url} failed:`, err);
    throw err;
  }
}

// Mifa API client
export const api = {
  // Analytics
  getFamilyAnalytics: async (orgId: string) => {
    const raw = await request<any>(`/api/mifa/analytics?orgId=${orgId}`);
    return {
      creditBalance: raw.credit_balance,
      totalMembers: raw.total_members,
      parents: raw.parents,
      children: raw.children,
      usagePeriod: raw.usage_period,
      members: (raw.member_usage || []).map((m: any) => ({
        ...m,
        weekly_cost: m.usage_amount || 0,
      })),
      flaggedCount: raw.flagged_count,
      pendingInvites: raw.pending_invites,
      totalConversations: (raw.member_usage || []).reduce(
        (sum: number, m: any) => sum + (m.transaction_count || 0),
        0
      ),
    };
  },

  getChildAnalytics: async (orgId: string, childId: string, days?: number) => {
    const raw = await request<any>(
      `/api/mifa/child-analytics?orgId=${orgId}&childId=${childId}${days ? `&days=${days}` : ""}`
    );
    const totalConversations = raw.totals?.conversations || 0;
    const totalCost = raw.totals?.cost || 0;
    const periodDays = raw.period?.days || days || 7;

    // Compute struggle ratio from subject breakdown
    const totalActivities = (raw.subjectBreakdown || []).reduce(
      (s: number, sb: any) => s + (sb.count || 0), 0
    );
    const totalStruggles = (raw.subjectBreakdown || []).reduce(
      (s: number, sb: any) => s + (sb.struggleCount || 0), 0
    );

    return {
      childName: raw.child?.displayName || "...",
      supervisionMode: raw.child?.supervisionMode,
      ageBracket: raw.child?.ageBracket,
      totalConversations,
      totalCost,
      dailyAvg: periodDays > 0 ? totalCost / periodDays : 0,
      struggleRatio: totalActivities > 0 ? totalStruggles / totalActivities : 0,
      dailyActivity: (raw.dailyActivity || []).map((d: any) => ({
        date: d.date,
        count: d.messages || 0,
        messageCount: d.messages || 0,
        conversations: d.conversations,
        cost: d.cost,
      })),
      activityTypes: raw.activityTypes || [],
      topTopics: (raw.topTopics || []).map((t: any) => {
        const label = t.topic.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase());
        return {
        name: label,
        topic: label,
        subject: t.subject,
        count: t.count,
        struggle: t.struggleRatio > 0.3,
        hasStruggle: t.struggleRatio > 0.3,
      };
      }),
      usageHeatmap: raw.usageHeatmap || [],
      flags: (raw.flags || []).map((f: any) => ({
        type: f.flagType,
        reason: f.flagReason,
        created_at: f.createdAt,
        dismissed: f.dismissed,
      })),
      recentConversations: (raw.recentConversations || []).map((c: any) => ({
        ...c,
        date: c.createdAt,
        created_at: c.createdAt,
      })),
      subjects: (raw.subjectBreakdown || []).map((s: any) => ({
        name: s.subject,
        count: s.count,
        struggleCount: s.struggleCount,
      })),
    };
  },

  getChildInsights: (orgId: string, childId: string) =>
    request<any>(`/api/mifa/child-insights`, {
      method: "POST",
      body: JSON.stringify({ childId }),
    }),

  getMyStats: () => request<any>(`/api/mifa/my-stats`),

  // Controls
  getControls: (orgId: string, childId: string) =>
    request<any>(
      `/api/mifa/controls?orgId=${orgId}&childId=${childId}`
    ),

  updateControls: (
    orgId: string,
    childId: string,
    settings: Record<string, any>
  ) =>
    request<any>(`/api/mifa/controls`, {
      method: "PUT",
      body: JSON.stringify({ orgId, childUserId: childId, ...settings }),
    }),

  // Assistants
  getAssistants: () => request<any>(`/api/mifa/assistants`),

  createAssistant: (data: {
    name: string;
    avatar: string;
    system_prompt: string;
    purpose?: string;
    color: string;
    gauges?: Record<string, number>;
  }) =>
    request<any>(`/api/mifa/assistants`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAssistant: (id: string, data: Record<string, any>) =>
    request<any>(`/api/mifa/assistants/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteAssistant: (id: string) =>
    request<any>(`/api/mifa/assistants/${id}`, {
      method: "DELETE",
    }),

  getAssistantXp: (id: string) =>
    request<any>(`/api/mifa/assistants/${id}/xp`),

  adoptAssistant: (shareCode: string) =>
    request<any>(`/api/mifa/assistants/adopt`, {
      method: "POST",
      body: JSON.stringify({ share_code: shareCode }),
    }),

  generateShareCode: (id: string) =>
    request<any>(`/api/mifa/assistants/${id}`, {
      method: "PUT",
      body: JSON.stringify({ share_code: "generate" }),
    }),

  // Credits
  transferCredits: (orgId: string, childId: string, amount: number) =>
    request<any>(`/api/mifa/transfer-credits`, {
      method: "POST",
      body: JSON.stringify({ orgId, childUserId: childId, amount }),
    }),

  requestCredits: (orgId: string) =>
    request<any>(`/api/mifa/request-credits`, {
      method: "POST",
      body: JSON.stringify({ orgId }),
    }),

  // Child Profile
  getChildProfile: (orgId: string, childId: string) =>
    request<any>(
      `/api/mifa/child-profile?orgId=${orgId}&childId=${childId}`
    ),

  updateChildProfile: (
    orgId: string,
    childId: string,
    data: Record<string, any>
  ) =>
    request<any>(`/api/mifa/child-profile`, {
      method: "PUT",
      body: JSON.stringify({ orgId, childUserId: childId, profile: data }),
    }),

  // Invites
  sendInvite: (orgId: string, email: string, role: string, name?: string) =>
    request<any>(`/api/mifa/invite`, {
      method: "POST",
      body: JSON.stringify({ orgId, email, role, name }),
    }),

  getInvites: async (orgId: string) => {
    const res = await request<{ invites: any[] }>(`/api/mifa/invite?orgId=${orgId}`);
    return res.invites;
  },

  resendInvite: (inviteId: string) =>
    request<any>(`/api/mifa/invite`, {
      method: "PATCH",
      body: JSON.stringify({ inviteId }),
    }),

  revokeInvite: (inviteId: string) =>
    request<any>(`/api/mifa/invite`, {
      method: "DELETE",
      body: JSON.stringify({ inviteId }),
    }),

  // Push token
  savePushToken: (token: string) =>
    request<any>(`/api/mifa/push-token`, {
      method: "PUT",
      body: JSON.stringify({ token }),
    }),

  // Theme
  updateTheme: (color: string) =>
    request<any>(`/api/mifa/theme`, {
      method: "PUT",
      body: JSON.stringify({ color }),
    }),

  // Chat
  getConversations: () => request<any>(`/api/conversations`),

  getConversation: (id: string) => request<any>(`/api/conversations/${id}`),

  sendMessage: async (
    conversationId: string | null,
    message: string,
    assistantId?: string
  ): Promise<{ content: string; conversationId?: string }> => {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        conversationId,
        message,
        model: DEFAULT_MODEL,
        stream: false,
        assistantId,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Chat request failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      content: data.content,
      conversationId: data.conversationId,
    };
  },
};
