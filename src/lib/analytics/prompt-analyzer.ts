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
  // New learning analytics fields
  matchedTopicId?: string;
  bloomLevel?: BloomLevel;
  topicConfidence?: number;
}

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

interface PromptToAnalyze {
  id: string;
  content: string;
}

interface ClassTopic {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
}

interface LLMAnalysisResponse {
  id: string;
  clarity: number;
  context: number;
  sophistication: number;
  actionability: number;
  topic?: string;
  // New fields for course-aware analysis
  matched_topic?: string; // topic ID
  topic_confidence?: number;
  bloom_level?: BloomLevel;
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
 * Build enhanced analysis prompt with course topics and Bloom's taxonomy
 */
function buildCourseAwarePrompt(topics: ClassTopic[]): string {
  const topicsDescription = topics
    .map(t => `- [ID: ${t.id}] ${t.title}${t.description ? `: ${t.description}` : ''}${t.keywords?.length ? ` (keywords: ${t.keywords.join(', ')})` : ''}`)
    .join('\n');

  return `You are analyzing student prompts for a course with the following topics:
${topicsDescription}

For each prompt, provide:
1. Quality scores (clarity, context, sophistication, actionability) - 0 to 100
2. topic: The general topic/subject (e.g., "marketing", "economics")
3. matched_topic: The topic ID from the list above that best matches this prompt (or null if none)
4. topic_confidence: How confident you are in the topic match (0.0 to 1.0)
5. bloom_level: The cognitive level based on Bloom's Taxonomy

Bloom's Taxonomy Guide:
- remember: Recalling facts ("What is X?", "Define X", "List the...")
- understand: Explaining concepts ("How does X work?", "Explain why...")
- apply: Using knowledge ("Help me do X", "Use X to solve...")
- analyze: Breaking down, comparing ("Compare X and Y", "Why does X happen?")
- evaluate: Judging, critiquing ("Is X effective?", "What are the pros/cons?")
- create: Producing new work ("Design X", "Build X", "Write a...")

IMPORTANT: Return ONLY a valid JSON array. Each object must have:
- id, clarity, context, sophistication, actionability (numbers 0-100)
- topic (string, optional)
- matched_topic (topic ID string or null)
- topic_confidence (number 0.0-1.0)
- bloom_level (one of: remember, understand, apply, analyze, evaluate, create)

Example response:
[{"id":"abc123","clarity":75,"context":60,"sophistication":80,"actionability":70,"topic":"marketing","matched_topic":"topic-uuid-here","topic_confidence":0.85,"bloom_level":"analyze"}]

Prompts to analyze:
`;
}


/**
 * Get topics for a class
 */
async function getClassTopics(classId: string): Promise<ClassTopic[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("class_topics")
    .select("id, title, description, keywords")
    .eq("class_id", classId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching class topics:", error);
    return [];
  }

  return data || [];
}

/**
 * Analyze a batch of prompts using LLM
 */
async function analyzePromptBatch(
  prompts: PromptToAnalyze[],
  model: string,
  classTopics?: ClassTopic[]
): Promise<{ results: PromptAnalysisResult[]; tokensUsed: number }> {
  if (prompts.length === 0) {
    return { results: [], tokensUsed: 0 };
  }

  // Build the prompt with all messages
  const promptList = prompts
    .map((p, i) => `${i + 1}. [id: ${p.id}] "${p.content.slice(0, 500)}"`)
    .join("\n");

  // Use course-aware prompt if topics are provided
  const basePrompt = classTopics && classTopics.length > 0
    ? buildCourseAwarePrompt(classTopics)
    : ANALYSIS_PROMPT;

  const fullPrompt = basePrompt + promptList;

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

    // Validate bloom levels
    const validBloomLevels = new Set(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);

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
      // New fields
      matchedTopicId: r.matched_topic || undefined,
      bloomLevel: r.bloom_level && validBloomLevels.has(r.bloom_level) ? r.bloom_level : undefined,
      topicConfidence: typeof r.topic_confidence === 'number' ? Math.max(0, Math.min(1, r.topic_confidence)) : undefined,
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
    // New learning analytics fields
    matched_topic_id: r.matchedTopicId || null,
    bloom_level: r.bloomLevel || null,
    topic_confidence: r.topicConfidence ?? null,
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
      // New learning analytics fields
      matchedTopicId: row.matched_topic_id || undefined,
      bloomLevel: row.bloom_level || undefined,
      topicConfidence: row.topic_confidence ?? undefined,
    });
  }

  return results;
}

/**
 * Analyze prompts - fetches existing analysis and only processes new ones
 * Returns a map of messageId -> analysis
 * @param prompts - Array of prompts to analyze
 * @param classId - Optional class ID to enable course-aware analysis with topics
 */
export async function analyzePrompts(
  prompts: PromptToAnalyze[],
  classId?: string
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

  // Get class topics if classId is provided
  const classTopics = classId ? await getClassTopics(classId) : undefined;
  if (classTopics && classTopics.length > 0) {
    console.log(`Using ${classTopics.length} class topics for course-aware analysis`);
  }

  // Process in batches
  const allResults = new Map(existingAnalysis);

  for (let i = 0; i < unanalyzedPrompts.length; i += BATCH_SIZE) {
    const batch = unanalyzedPrompts.slice(i, i + BATCH_SIZE);

    const { results, tokensUsed } = await analyzePromptBatch(batch, model, classTopics);

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
 * Analyze prompts for a specific class (with course-aware topics and Bloom classification)
 */
export async function analyzeClassPrompts(
  classId: string,
  prompts: PromptToAnalyze[]
): Promise<Map<string, PromptAnalysisResult>> {
  return analyzePrompts(prompts, classId);
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
