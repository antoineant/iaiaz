/**
 * NLP-based prompt quality analysis using LLM
 * Analyzes student prompts for clarity, context, sophistication, and actionability
 *
 * Uses the centralized model configuration from src/lib/models.ts
 * The model used is the "economy_model" setting (designed for cost-sensitive operations)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { callAI } from "@/lib/ai/providers";
import { getEconomyModel } from "@/lib/models";

export interface PromptAnalysisResult {
  messageId: string;
  clarity: number;
  context: number;
  sophistication: number;
  actionability: number;
  overall: number;
  topic?: string;
}

interface PromptToAnalyze {
  id: string;
  content: string;
}

interface LLMAnalysisResponse {
  id: string;
  clarity: number;
  context: number;
  sophistication: number;
  actionability: number;
  topic?: string;
}

const BATCH_SIZE = 20;

const ANALYSIS_PROMPT = `You are analyzing student prompts sent to an educational AI assistant.
For each prompt, score from 0 to 100 on these dimensions:

- clarity: How clear and specific is the question? (vague "help me" = low, specific question = high)
- context: Does it provide relevant background information? (no context = low, includes course/topic context = high)
- sophistication: What is the analytical depth? (simple definition = low, comparative analysis = high)
- actionability: Can the AI provide a useful, focused response? (too broad = low, focused request = high)

Also identify the main topic/subject if possible (e.g., "marketing", "economics", "law", "programming").

IMPORTANT: Return ONLY a valid JSON array, no other text. Each object must have: id, clarity, context, sophistication, actionability, topic (optional).

Example response:
[{"id":"abc123","clarity":75,"context":60,"sophistication":80,"actionability":70,"topic":"marketing"}]

Prompts to analyze:
`;


/**
 * Analyze a batch of prompts using LLM
 */
async function analyzePromptBatch(
  prompts: PromptToAnalyze[],
  model: string
): Promise<{ results: PromptAnalysisResult[]; tokensUsed: number }> {
  if (prompts.length === 0) {
    return { results: [], tokensUsed: 0 };
  }

  // Build the prompt with all messages
  const promptList = prompts
    .map((p, i) => `${i + 1}. [id: ${p.id}] "${p.content.slice(0, 500)}"`)
    .join("\n");

  const fullPrompt = ANALYSIS_PROMPT + promptList;

  try {
    const response = await callAI(model, [
      { role: "user", content: fullPrompt },
    ]);

    // Parse JSON response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Failed to parse LLM response:", response.content);
      return { results: [], tokensUsed: response.tokensInput + response.tokensOutput };
    }

    const analysisResults: LLMAnalysisResponse[] = JSON.parse(jsonMatch[0]);

    // Convert to our format with overall score
    const results: PromptAnalysisResult[] = analysisResults.map((r) => ({
      messageId: r.id,
      clarity: Math.max(0, Math.min(100, r.clarity)),
      context: Math.max(0, Math.min(100, r.context)),
      sophistication: Math.max(0, Math.min(100, r.sophistication)),
      actionability: Math.max(0, Math.min(100, r.actionability)),
      overall: Math.round(
        (r.clarity + r.context + r.sophistication + r.actionability) / 4
      ),
      topic: r.topic,
    }));

    return {
      results,
      tokensUsed: response.tokensInput + response.tokensOutput,
    };
  } catch (error) {
    console.error("Error analyzing prompts:", error);
    return { results: [], tokensUsed: 0 };
  }
}

/**
 * Store analysis results in database
 */
async function storeAnalysisResults(
  results: PromptAnalysisResult[],
  model: string,
  tokensUsed: number
): Promise<void> {
  if (results.length === 0) return;

  const adminClient = createAdminClient();
  const tokensPerResult = Math.ceil(tokensUsed / results.length);

  const rows = results.map((r) => ({
    message_id: r.messageId,
    clarity_score: r.clarity,
    context_score: r.context,
    sophistication_score: r.sophistication,
    actionability_score: r.actionability,
    overall_score: r.overall,
    topic: r.topic || null,
    model_used: model,
    tokens_used: tokensPerResult,
  }));

  const { error } = await adminClient
    .from("prompt_analysis")
    .upsert(rows, { onConflict: "message_id" });

  if (error) {
    console.error("Error storing prompt analysis:", error);
  }
}

/**
 * Get existing analysis for messages (from cache)
 */
export async function getExistingAnalysis(
  messageIds: string[]
): Promise<Map<string, PromptAnalysisResult>> {
  if (messageIds.length === 0) {
    return new Map();
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("prompt_analysis")
    .select("*")
    .in("message_id", messageIds);

  if (error) {
    console.error("Error fetching existing analysis:", error);
    return new Map();
  }

  const results = new Map<string, PromptAnalysisResult>();

  for (const row of data || []) {
    results.set(row.message_id, {
      messageId: row.message_id,
      clarity: row.clarity_score,
      context: row.context_score,
      sophistication: row.sophistication_score,
      actionability: row.actionability_score,
      overall: row.overall_score,
      topic: row.topic,
    });
  }

  return results;
}

/**
 * Analyze prompts - fetches existing analysis and only processes new ones
 * Returns a map of messageId -> analysis
 */
export async function analyzePrompts(
  prompts: PromptToAnalyze[]
): Promise<Map<string, PromptAnalysisResult>> {
  if (prompts.length === 0) {
    return new Map();
  }

  // Get existing analysis
  const messageIds = prompts.map((p) => p.id);
  const existingAnalysis = await getExistingAnalysis(messageIds);

  // Filter to only unanalyzed prompts
  const unanalyzedPrompts = prompts.filter(
    (p) => !existingAnalysis.has(p.id)
  );

  if (unanalyzedPrompts.length === 0) {
    return existingAnalysis;
  }

  console.log(
    `Analyzing ${unanalyzedPrompts.length} new prompts (${existingAnalysis.size} cached)`
  );

  // Get model to use
  // Use the economy model from centralized config (designed for cost-sensitive operations)
  const model = await getEconomyModel();

  // Process in batches
  const allResults = new Map(existingAnalysis);

  for (let i = 0; i < unanalyzedPrompts.length; i += BATCH_SIZE) {
    const batch = unanalyzedPrompts.slice(i, i + BATCH_SIZE);

    const { results, tokensUsed } = await analyzePromptBatch(batch, model);

    // Store in database
    await storeAnalysisResults(results, model, tokensUsed);

    // Add to results map
    for (const result of results) {
      allResults.set(result.messageId, result);
    }
  }

  return allResults;
}

/**
 * Calculate average NLP score for a set of message IDs
 */
export function calculateAverageNLPScore(
  messageIds: string[],
  analysis: Map<string, PromptAnalysisResult>
): number | null {
  const scores = messageIds
    .map((id) => analysis.get(id)?.overall)
    .filter((s): s is number => s !== undefined);

  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Calculate detailed NLP breakdown for a set of message IDs
 */
export interface NLPBreakdown {
  clarity: number;
  context: number;
  sophistication: number;
  actionability: number;
  overall: number;
  messageCount: number;
}

export function calculateNLPBreakdown(
  messageIds: string[],
  analysis: Map<string, PromptAnalysisResult>
): NLPBreakdown | null {
  const results = messageIds
    .map((id) => analysis.get(id))
    .filter((r): r is PromptAnalysisResult => r !== undefined);

  if (results.length === 0) {
    return null;
  }

  const sum = results.reduce(
    (acc, r) => ({
      clarity: acc.clarity + r.clarity,
      context: acc.context + r.context,
      sophistication: acc.sophistication + r.sophistication,
      actionability: acc.actionability + r.actionability,
      overall: acc.overall + r.overall,
    }),
    { clarity: 0, context: 0, sophistication: 0, actionability: 0, overall: 0 }
  );

  const count = results.length;
  return {
    clarity: Math.round(sum.clarity / count),
    context: Math.round(sum.context / count),
    sophistication: Math.round(sum.sophistication / count),
    actionability: Math.round(sum.actionability / count),
    overall: Math.round(sum.overall / count),
    messageCount: count,
  };
}

/**
 * Get example prompts by quality tier
 */
export interface ExamplePrompt {
  content: string;
  overall: number;
  topic?: string;
}

export interface ExamplesByTier {
  low: ExamplePrompt[];    // < 40
  medium: ExamplePrompt[]; // 40-70
  high: ExamplePrompt[];   // > 70
}

export async function getExamplePromptsByTier(
  messageIds: string[],
  maxPerTier: number = 3
): Promise<ExamplesByTier> {
  if (messageIds.length === 0) {
    return { low: [], medium: [], high: [] };
  }

  const adminClient = createAdminClient();

  // Fetch analyzed messages with their content
  const { data } = await adminClient
    .from("prompt_analysis")
    .select(`
      message_id,
      overall_score,
      topic,
      messages!inner(content)
    `)
    .in("message_id", messageIds)
    .order("overall_score", { ascending: true });

  if (!data || data.length === 0) {
    return { low: [], medium: [], high: [] };
  }

  const examples: ExamplesByTier = { low: [], medium: [], high: [] };

  for (const row of data) {
    const message = row.messages as unknown as { content: string };
    const content = message?.content || "";
    // Truncate and anonymize
    const truncated = content.length > 150 ? content.slice(0, 147) + "..." : content;

    const example: ExamplePrompt = {
      content: truncated,
      overall: row.overall_score,
      topic: row.topic || undefined,
    };

    if (row.overall_score < 40 && examples.low.length < maxPerTier) {
      examples.low.push(example);
    } else if (row.overall_score >= 40 && row.overall_score <= 70 && examples.medium.length < maxPerTier) {
      examples.medium.push(example);
    } else if (row.overall_score > 70 && examples.high.length < maxPerTier) {
      examples.high.push(example);
    }
  }

  return examples;
}

/**
 * Get class-wide NLP breakdown (average across all students)
 */
export async function getClassNLPBreakdown(
  classId: string,
  periodDays: number = 30
): Promise<NLPBreakdown | null> {
  const adminClient = createAdminClient();

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Get all class members
  const { data: members } = await adminClient
    .from("organization_members")
    .select("user_id")
    .eq("class_id", classId)
    .eq("status", "active")
    .eq("role", "student");

  if (!members || members.length === 0) {
    return null;
  }

  const studentIds = members.map((m) => m.user_id);

  // Get conversations for these students
  const { data: conversations } = await adminClient
    .from("conversations")
    .select("id")
    .in("user_id", studentIds)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (!conversations || conversations.length === 0) {
    return null;
  }

  const conversationIds = conversations.map((c) => c.id);

  // Get user messages
  const { data: messages } = await adminClient
    .from("messages")
    .select("id")
    .in("conversation_id", conversationIds)
    .eq("role", "user");

  if (!messages || messages.length === 0) {
    return null;
  }

  const messageIds = messages.map((m) => m.id);

  // Get prompt analysis for these messages
  const { data: analysis } = await adminClient
    .from("prompt_analysis")
    .select("clarity_score, context_score, sophistication_score, actionability_score, overall_score")
    .in("message_id", messageIds);

  if (!analysis || analysis.length === 0) {
    return null;
  }

  const sum = analysis.reduce(
    (acc, r) => ({
      clarity: acc.clarity + r.clarity_score,
      context: acc.context + r.context_score,
      sophistication: acc.sophistication + r.sophistication_score,
      actionability: acc.actionability + r.actionability_score,
      overall: acc.overall + r.overall_score,
    }),
    { clarity: 0, context: 0, sophistication: 0, actionability: 0, overall: 0 }
  );

  const count = analysis.length;
  return {
    clarity: Math.round(sum.clarity / count),
    context: Math.round(sum.context / count),
    sophistication: Math.round(sum.sophistication / count),
    actionability: Math.round(sum.actionability / count),
    overall: Math.round(sum.overall / count),
    messageCount: count,
  };
}
