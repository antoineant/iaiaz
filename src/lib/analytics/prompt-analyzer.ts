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
