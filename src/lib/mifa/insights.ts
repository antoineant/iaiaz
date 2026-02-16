import { createAdminClient } from "@/lib/supabase/admin";
import { callAI } from "@/lib/ai/providers";
import { getAnalyticsModel } from "@/lib/models";

export interface ChildSuggestion {
  emoji: string;
  title: string;
  body: string;
  category: "struggle" | "usage" | "safety" | "encouragement";
}

export interface ChildInsightsResult {
  suggestions: ChildSuggestion[];
  generatedAt: string;
  cached: boolean;
}

interface AnalyticsSummary {
  child: {
    displayName: string;
    ageBracket: string | null;
    supervisionMode: string | null;
    schoolYear: string | null;
  };
  totals: {
    conversations: number;
    messages: number;
    cost: number;
  };
  subjectBreakdown: Array<{
    subject: string;
    count: number;
    struggleCount: number;
  }>;
  topTopics: Array<{
    topic: string;
    subject: string;
    count: number;
    struggleRatio: number;
  }>;
  usageHeatmap: Array<{ dayOfWeek: number; hour: number; count: number }>;
  flags: Array<{
    flagType: string;
    flagReason: string;
    createdAt: string;
  }>;
  period: { days: number };
}

/**
 * Compute data fingerprint for cache invalidation
 */
export function computeFingerprint(
  conversations: number,
  messages: number,
  days: number
): string {
  return `${conversations}-${messages}-${days}`;
}

/**
 * Get cached insights if fingerprint matches
 */
export async function getCachedChildInsights(
  childId: string,
  periodDays: number,
  locale: string,
  currentFingerprint: string
): Promise<ChildInsightsResult | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("mifa_child_insights")
    .select("suggestions, data_fingerprint, generated_at")
    .eq("child_id", childId)
    .eq("period_days", periodDays)
    .eq("locale", locale)
    .single();

  if (data && data.data_fingerprint === currentFingerprint) {
    return {
      suggestions: data.suggestions as ChildSuggestion[],
      generatedAt: data.generated_at,
      cached: true,
    };
  }

  return null;
}

/**
 * Generate AI-powered suggestions for a child's parent
 */
export async function generateChildInsights(
  childId: string,
  orgId: string,
  analytics: AnalyticsSummary,
  locale: string,
  fingerprint: string
): Promise<ChildInsightsResult> {
  const prompt = buildChildInsightsPrompt(analytics, locale);

  try {
    const modelId = await getAnalyticsModel();

    const response = await callAI(modelId, [
      { role: "user", content: prompt },
    ]);

    const suggestions = parseSuggestionsResponse(response.content);

    // Upsert into database
    const admin = createAdminClient();
    await admin
      .from("mifa_child_insights")
      .upsert(
        {
          child_id: childId,
          organization_id: orgId,
          period_days: analytics.period.days,
          locale,
          suggestions,
          data_fingerprint: fingerprint,
          model_used: modelId,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "child_id,period_days,locale" }
      );

    return {
      suggestions,
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  } catch (error) {
    console.error("Failed to generate child insights:", error);
    return {
      suggestions: getDefaultSuggestions(locale),
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  }
}

function buildChildInsightsPrompt(
  analytics: AnalyticsSummary,
  locale: string
): string {
  const lang = locale === "fr" ? "French" : "English";
  const { child, totals, subjectBreakdown, topTopics, usageHeatmap, flags, period } = analytics;

  // Compute struggle ratio
  const totalActivities = subjectBreakdown.reduce((s, sub) => s + sub.count, 0);
  const totalStruggles = subjectBreakdown.reduce((s, sub) => s + sub.struggleCount, 0);
  const strugglePercent = totalActivities > 0 ? Math.round((totalStruggles / totalActivities) * 100) : 0;

  // Top struggling subjects
  const strugglingSubjects = subjectBreakdown
    .filter((s) => s.struggleCount > 0)
    .sort((a, b) => b.struggleCount - a.struggleCount)
    .slice(0, 3)
    .map((s) => `${s.subject} (${s.struggleCount}/${s.count} sessions with difficulty)`);

  // Top struggling topics
  const strugglingTopics = topTopics
    .filter((t) => t.struggleRatio > 0.3)
    .sort((a, b) => b.struggleRatio * b.count - a.struggleRatio * a.count)
    .slice(0, 5)
    .map((t) => `${t.topic} in ${t.subject} (${Math.round(t.struggleRatio * 100)}% difficulty)`);

  // Usage timing patterns
  const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const peakHours = usageHeatmap
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((h) => `${dayLabels[h.dayOfWeek]} at ${h.hour}h (${h.count} messages)`);

  // Safety flags summary
  const flagsSummary = flags.length > 0
    ? flags.slice(0, 5).map((f) => `${f.flagType}: ${f.flagReason}`).join("; ")
    : "None";

  return `You are a caring educational advisor helping a parent understand their child's AI learning tool usage. Based on the data below, provide 3-5 actionable suggestions.

CHILD PROFILE:
- Name: ${child.displayName}
- Age bracket: ${child.ageBracket || "unknown"}
- School year: ${child.schoolYear || "unknown"}
- Supervision mode: ${child.supervisionMode || "unknown"}
- Period: last ${period.days} days

USAGE SUMMARY:
- Conversations: ${totals.conversations}
- Messages sent: ${totals.messages}
- Total cost: €${totals.cost.toFixed(2)}
- Struggle ratio: ${strugglePercent}%

STRUGGLING SUBJECTS: ${strugglingSubjects.length > 0 ? strugglingSubjects.join(", ") : "None detected"}
STRUGGLING TOPICS: ${strugglingTopics.length > 0 ? strugglingTopics.join(", ") : "None detected"}
PEAK USAGE TIMES: ${peakHours.length > 0 ? peakHours.join(", ") : "No significant patterns"}
SAFETY FLAGS: ${flagsSummary}

INSTRUCTIONS:
- Be warm, supportive, and non-alarmist. You are helping a parent, not judging.
- Tailor advice to the age bracket: ${child.ageBracket === "12-14" ? "younger teens need more guidance and structure" : child.ageBracket === "15-17" ? "older teens benefit from more autonomy with gentle nudges" : "adjust for the child's age"}
- Prioritize: safety flags > high struggle areas > usage patterns > encouragement
- Each suggestion must be concrete and actionable (not generic advice)
- Respond in ${lang}

Respond ONLY with a JSON array of 3-5 suggestions, each with this structure:
[
  {
    "emoji": "a single relevant emoji",
    "title": "Short title (max 8 words)",
    "body": "2-3 sentence explanation with specific, actionable advice",
    "category": "struggle|usage|safety|encouragement"
  }
]

Respond ONLY with the JSON array, no additional text.`;
}

function parseSuggestionsResponse(content: string): ChildSuggestion[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .slice(0, 5)
          .map((item: Record<string, string>) => ({
            emoji: item.emoji || "💡",
            title: item.title || "",
            body: item.body || "",
            category: (["struggle", "usage", "safety", "encouragement"].includes(item.category)
              ? item.category
              : "encouragement") as ChildSuggestion["category"],
          }))
          .filter((s: ChildSuggestion) => s.title && s.body);
      }
    }
  } catch (error) {
    console.error("Failed to parse child suggestions:", error);
  }
  return [];
}

function getDefaultSuggestions(locale: string): ChildSuggestion[] {
  if (locale === "fr") {
    return [
      {
        emoji: "💡",
        title: "Analyse en cours",
        body: "Les données sont insuffisantes pour générer des suggestions personnalisées. Revenez après quelques jours d'utilisation.",
        category: "encouragement",
      },
    ];
  }
  return [
    {
      emoji: "💡",
      title: "Analysis in progress",
      body: "Not enough data to generate personalized suggestions. Come back after a few days of usage.",
      category: "encouragement",
    },
  ];
}
