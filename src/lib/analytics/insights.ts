import { createAdminClient } from "@/lib/supabase/admin";
import { callAI } from "@/lib/ai/providers";
import type { ClassMetrics } from "./compute";

export interface AIInsights {
  summary: string;
  engagement_analysis: {
    level: "low" | "medium" | "high";
    description: string;
  };
  usage_patterns: string[];
  model_preferences: string;
  recommendations: string[];
  generated_at: string;
}

/**
 * Generate AI-powered insights for class analytics
 */
export async function generateClassInsights(
  classId: string,
  className: string,
  metrics: ClassMetrics,
  locale: string = "fr"
): Promise<AIInsights> {
  const prompt = buildInsightsPrompt(className, metrics, locale);

  try {
    // Use Sonnet for higher quality insights
    const response = await callAI("claude-sonnet-4-20250514", [
      { role: "user", content: prompt },
    ]);

    // Parse the JSON response
    const insights = parseInsightsResponse(response.content, locale);

    // Store insights in the database
    await storeInsights(classId, insights);

    return insights;
  } catch (error) {
    console.error("Failed to generate insights:", error);
    return getDefaultInsights(locale);
  }
}

function buildInsightsPrompt(
  className: string,
  metrics: ClassMetrics,
  locale: string
): string {
  const lang = locale === "fr" ? "French" : "English";

  return `You are an educational analytics expert. Analyze the following learning platform usage data for the class "${className}" and provide actionable insights.

DATA:
- Total messages: ${metrics.total_messages}
- Total conversations: ${metrics.total_conversations}
- Total cost: €${metrics.total_cost}
- Unique students: ${metrics.unique_students}
- Active students: ${metrics.active_students}
- Model usage: ${JSON.stringify(metrics.model_usage)}
- Peak hours: ${metrics.peak_hours.join(", ")}h
- Top 5 active students by messages: ${metrics.top_students.slice(0, 5).map((s) => `${s.name}: ${s.messages} msgs`).join(", ")}

Provide your analysis in ${lang} as a JSON object with this exact structure:
{
  "summary": "A 2-3 sentence summary of the overall class engagement",
  "engagement_analysis": {
    "level": "low|medium|high",
    "description": "Brief description of engagement level and what it means"
  },
  "usage_patterns": ["Pattern 1", "Pattern 2", "Pattern 3"],
  "model_preferences": "Brief analysis of which AI models students prefer and why",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}

Focus on:
1. Student engagement levels
2. Learning patterns
3. Actionable recommendations for the trainer
4. Any concerning patterns (low engagement, over-reliance on AI, etc.)

Respond ONLY with the JSON object, no additional text.`;
}

function parseInsightsResponse(content: string, locale: string): AIInsights {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || getDefaultInsights(locale).summary,
        engagement_analysis: parsed.engagement_analysis || getDefaultInsights(locale).engagement_analysis,
        usage_patterns: parsed.usage_patterns || [],
        model_preferences: parsed.model_preferences || "",
        recommendations: parsed.recommendations || [],
        generated_at: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Failed to parse insights:", error);
  }

  return getDefaultInsights(locale);
}

function getDefaultInsights(locale: string): AIInsights {
  const isFrench = locale === "fr";

  return {
    summary: isFrench
      ? "Les données sont insuffisantes pour générer une analyse détaillée."
      : "Insufficient data to generate detailed analysis.",
    engagement_analysis: {
      level: "medium",
      description: isFrench
        ? "Niveau d'engagement normal"
        : "Normal engagement level",
    },
    usage_patterns: [],
    model_preferences: isFrench
      ? "Pas assez de données pour analyser les préférences de modèles."
      : "Not enough data to analyze model preferences.",
    recommendations: [
      isFrench
        ? "Encouragez les étudiants à utiliser l'IA pour leurs travaux."
        : "Encourage students to use AI for their work.",
    ],
    generated_at: new Date().toISOString(),
  };
}

async function storeInsights(classId: string, insights: AIInsights): Promise<void> {
  const adminClient = createAdminClient();

  // Update the most recent analytics record with insights
  const { data: recentAnalytics } = await adminClient
    .from("class_analytics")
    .select("id")
    .eq("class_id", classId)
    .order("period_start", { ascending: false })
    .limit(1)
    .single();

  if (recentAnalytics) {
    await adminClient
      .from("class_analytics")
      .update({ ai_insights: insights })
      .eq("id", recentAnalytics.id);
  }
}

/**
 * Get cached insights for a class
 */
export async function getCachedInsights(classId: string): Promise<AIInsights | null> {
  const adminClient = createAdminClient();

  const { data } = await adminClient
    .from("class_analytics")
    .select("ai_insights")
    .eq("class_id", classId)
    .not("ai_insights", "is", null)
    .order("period_start", { ascending: false })
    .limit(1)
    .single();

  if (data?.ai_insights) {
    return data.ai_insights as AIInsights;
  }

  return null;
}
