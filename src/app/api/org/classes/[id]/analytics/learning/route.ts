import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageClass } from "@/lib/org";
import type { BloomLevel } from "@/lib/analytics/prompt-analyzer";

type RouteParams = { params: Promise<{ id: string }> };

interface TopicCoverage {
  topic_id: string;
  topic_title: string;
  parent_id: string | null;
  message_count: number;
  percentage: number;
  avg_bloom_level: string | null;
  avg_topic_confidence: number | null;
}

interface BloomDistribution {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

interface ProgressOverTime {
  date: string;
  topics_covered: number;
  avg_bloom_level: string | null;
  message_count: number;
}

interface LearningAnalyticsResponse {
  topicCoverage: TopicCoverage[];
  bloomDistribution: BloomDistribution;
  uncoveredTopics: Array<{ id: string; title: string }>;
  progressOverTime: ProgressOverTime[];
  totalAnalyzedMessages: number;
  hasStructure: boolean;
}

// Bloom level numeric values for averaging
const BLOOM_LEVELS: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
const BLOOM_TO_NUM: Record<BloomLevel, number> = {
  remember: 1,
  understand: 2,
  apply: 3,
  analyze: 4,
  evaluate: 5,
  create: 6,
};

function numToBloom(avg: number): BloomLevel {
  const rounded = Math.round(avg);
  const clamped = Math.max(1, Math.min(6, rounded));
  return BLOOM_LEVELS[clamped - 1];
}

// GET /api/org/classes/[id]/analytics/learning - Get learning analytics
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: classId } = await params;
    const { searchParams } = new URL(request.url);
    const periodDays = parseInt(searchParams.get("period") || "30", 10);

    if (!(await canManageClass(classId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get class topics
    const { data: topics } = await adminClient
      .from("class_topics")
      .select("id, title, parent_id")
      .eq("class_id", classId)
      .order("sort_order", { ascending: true });

    // If no course structure defined, return early
    if (!topics || topics.length === 0) {
      return NextResponse.json({
        topicCoverage: [],
        bloomDistribution: { remember: 0, understand: 0, apply: 0, analyze: 0, evaluate: 0, create: 0 },
        uncoveredTopics: [],
        progressOverTime: [],
        totalAnalyzedMessages: 0,
        hasStructure: false,
      } satisfies LearningAnalyticsResponse);
    }

    // Get date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Get all class students
    const { data: members } = await adminClient
      .from("organization_members")
      .select("user_id")
      .eq("class_id", classId)
      .eq("status", "active")
      .eq("role", "student");

    if (!members || members.length === 0) {
      return NextResponse.json({
        topicCoverage: topics.map((t) => ({
          topic_id: t.id,
          topic_title: t.title,
          parent_id: t.parent_id,
          message_count: 0,
          percentage: 0,
          avg_bloom_level: null,
          avg_topic_confidence: null,
        })),
        bloomDistribution: { remember: 0, understand: 0, apply: 0, analyze: 0, evaluate: 0, create: 0 },
        uncoveredTopics: topics.map((t) => ({ id: t.id, title: t.title })),
        progressOverTime: [],
        totalAnalyzedMessages: 0,
        hasStructure: true,
      } satisfies LearningAnalyticsResponse);
    }

    const studentIds = members.map((m) => m.user_id);

    // Get conversations for these students in the period
    const { data: conversations } = await adminClient
      .from("conversations")
      .select("id")
      .in("user_id", studentIds)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        topicCoverage: topics.map((t) => ({
          topic_id: t.id,
          topic_title: t.title,
          parent_id: t.parent_id,
          message_count: 0,
          percentage: 0,
          avg_bloom_level: null,
          avg_topic_confidence: null,
        })),
        bloomDistribution: { remember: 0, understand: 0, apply: 0, analyze: 0, evaluate: 0, create: 0 },
        uncoveredTopics: topics.map((t) => ({ id: t.id, title: t.title })),
        progressOverTime: [],
        totalAnalyzedMessages: 0,
        hasStructure: true,
      } satisfies LearningAnalyticsResponse);
    }

    const conversationIds = conversations.map((c) => c.id);

    // Get user messages
    const { data: messages } = await adminClient
      .from("messages")
      .select("id, created_at")
      .in("conversation_id", conversationIds)
      .eq("role", "user");

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        topicCoverage: topics.map((t) => ({
          topic_id: t.id,
          topic_title: t.title,
          parent_id: t.parent_id,
          message_count: 0,
          percentage: 0,
          avg_bloom_level: null,
          avg_topic_confidence: null,
        })),
        bloomDistribution: { remember: 0, understand: 0, apply: 0, analyze: 0, evaluate: 0, create: 0 },
        uncoveredTopics: topics.map((t) => ({ id: t.id, title: t.title })),
        progressOverTime: [],
        totalAnalyzedMessages: 0,
        hasStructure: true,
      } satisfies LearningAnalyticsResponse);
    }

    const messageIds = messages.map((m) => m.id);

    // Get prompt analysis for these messages
    const { data: analysis } = await adminClient
      .from("prompt_analysis")
      .select("message_id, matched_topic_id, bloom_level, topic_confidence")
      .in("message_id", messageIds);

    const analysisMap = new Map(
      (analysis || []).map((a) => [a.message_id, a])
    );

    // Calculate topic coverage
    const topicStats = new Map<
      string,
      { count: number; bloomSum: number; bloomCount: number; confidenceSum: number; confidenceCount: number }
    >();

    // Initialize all topics
    for (const topic of topics) {
      topicStats.set(topic.id, {
        count: 0,
        bloomSum: 0,
        bloomCount: 0,
        confidenceSum: 0,
        confidenceCount: 0,
      });
    }

    // Calculate Bloom distribution
    const bloomDist: BloomDistribution = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0,
    };

    let totalAnalyzed = 0;

    for (const [, a] of analysisMap) {
      totalAnalyzed++;

      // Count Bloom levels
      if (a.bloom_level && a.bloom_level in bloomDist) {
        bloomDist[a.bloom_level as BloomLevel]++;
      }

      // Count topic matches
      if (a.matched_topic_id && topicStats.has(a.matched_topic_id)) {
        const stats = topicStats.get(a.matched_topic_id)!;
        stats.count++;

        if (a.bloom_level) {
          stats.bloomSum += BLOOM_TO_NUM[a.bloom_level as BloomLevel] || 0;
          stats.bloomCount++;
        }

        if (typeof a.topic_confidence === "number") {
          stats.confidenceSum += a.topic_confidence;
          stats.confidenceCount++;
        }
      }
    }

    // Build topic coverage array
    const totalMessages = totalAnalyzed || 1; // Avoid division by zero
    const topicCoverage: TopicCoverage[] = topics.map((t) => {
      const stats = topicStats.get(t.id)!;
      return {
        topic_id: t.id,
        topic_title: t.title,
        parent_id: t.parent_id,
        message_count: stats.count,
        percentage: Math.round((stats.count / totalMessages) * 100),
        avg_bloom_level: stats.bloomCount > 0 ? numToBloom(stats.bloomSum / stats.bloomCount) : null,
        avg_topic_confidence:
          stats.confidenceCount > 0
            ? Math.round((stats.confidenceSum / stats.confidenceCount) * 100) / 100
            : null,
      };
    });

    // Find uncovered topics
    const uncoveredTopics = topics
      .filter((t) => (topicStats.get(t.id)?.count || 0) === 0)
      .map((t) => ({ id: t.id, title: t.title }));

    // Calculate progress over time (by day)
    const messagesByDate = new Map<string, { messages: string[]; bloom: BloomLevel[] }>();

    for (const msg of messages) {
      const date = new Date(msg.created_at).toISOString().split("T")[0];
      if (!messagesByDate.has(date)) {
        messagesByDate.set(date, { messages: [], bloom: [] });
      }
      const dayData = messagesByDate.get(date)!;
      dayData.messages.push(msg.id);

      const msgAnalysis = analysisMap.get(msg.id);
      if (msgAnalysis?.bloom_level) {
        dayData.bloom.push(msgAnalysis.bloom_level as BloomLevel);
      }
    }

    const progressOverTime: ProgressOverTime[] = [...messagesByDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        // Count unique topics covered that day
        const topicsCoveredThatDay = new Set<string>();
        for (const msgId of data.messages) {
          const a = analysisMap.get(msgId);
          if (a?.matched_topic_id) {
            topicsCoveredThatDay.add(a.matched_topic_id);
          }
        }

        // Calculate average bloom level for the day
        let avgBloom: string | null = null;
        if (data.bloom.length > 0) {
          const bloomSum = data.bloom.reduce((sum, b) => sum + BLOOM_TO_NUM[b], 0);
          avgBloom = numToBloom(bloomSum / data.bloom.length);
        }

        return {
          date,
          topics_covered: topicsCoveredThatDay.size,
          avg_bloom_level: avgBloom,
          message_count: data.messages.length,
        };
      });

    return NextResponse.json({
      topicCoverage,
      bloomDistribution: bloomDist,
      uncoveredTopics,
      progressOverTime,
      totalAnalyzedMessages: totalAnalyzed,
      hasStructure: true,
    } satisfies LearningAnalyticsResponse);
  } catch (error) {
    console.error("Learning analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
