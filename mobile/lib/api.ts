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
  getFamilyAnalytics: (orgId: string) =>
    request<any>(`/api/mifa/analytics?orgId=${orgId}`),

  getChildAnalytics: (orgId: string, childId: string) =>
    request<any>(
      `/api/mifa/child-analytics?orgId=${orgId}&childId=${childId}`
    ),

  getChildInsights: (orgId: string, childId: string) =>
    request<any>(
      `/api/mifa/child-insights?orgId=${orgId}&childId=${childId}`
    ),

  getMyStats: () => request<any>(`/api/mifa/my-stats`),

  // Controls
  getControls: (orgId: string, childId: string) =>
    request<any>(
      `/api/mifa/controls?orgId=${orgId}&childUserId=${childId}`
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
      `/api/mifa/child-profile?orgId=${orgId}&childUserId=${childId}`
    ),

  updateChildProfile: (
    orgId: string,
    childId: string,
    data: Record<string, any>
  ) =>
    request<any>(`/api/mifa/child-profile`, {
      method: "PUT",
      body: JSON.stringify({ orgId, childUserId: childId, ...data }),
    }),

  // Invites
  sendInvite: (orgId: string, email: string, role: string) =>
    request<any>(`/api/mifa/invite`, {
      method: "POST",
      body: JSON.stringify({ orgId, email, role }),
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
