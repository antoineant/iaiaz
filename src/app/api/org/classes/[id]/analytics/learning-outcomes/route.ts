import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageClass } from "@/lib/org";
import type { BloomLevel } from "@/lib/analytics/prompt-analyzer";

type RouteParams = { params: Promise<{ id: string }> };

// Bloom level numeric values for scoring
const BLOOM_TO_NUM: Record<BloomLevel, number> = {
  remember: 1,
  understand: 2,
  apply: 3,
  analyze: 4,
  evaluate: 5,
  create: 6,
};

type TopicStatus = 'strong' | 'on_track' | 'needs_attention' | 'no_data';

interface StudentTopicScore {
  topic_id: string;
  message_count: number;
  avg_bloom: number;
  score: number;
  status: TopicStatus;
}

interface StudentOutcome {
  id: string;
  name: string;
  email: string;
  topics: StudentTopicScore[];
  overall_score: number;
}

interface TopicInfo {
  id: string;
  name: string;
  description: string | null;
}

interface ClassAverage {
  topic_id: string;
  avg_score: number;
  std_dev: number;
}

interface LearningOutcomesResponse {
  students: StudentOutcome[];
  topics: TopicInfo[];
  class_averages: ClassAverage[];
  has_structure: boolean;
}

// GET /api/org/classes/[id]/analytics/learning-outcomes
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
      .select("id, title, description")
      .eq("class_id", classId)
      .order("sort_order", { ascending: true });

    // If no course structure defined, return early
    if (!topics || topics.length === 0) {
      return NextResponse.json({
        students: [],
        topics: [],
        class_averages: [],
        has_structure: false,
      } satisfies LearningOutcomesResponse);
    }

    // Get date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Get all class students with their info
    const { data: members } = await adminClient
      .from("organization_members")
      .select("user_id, display_name, users!inner(email)")
      .eq("class_id", classId)
      .eq("status", "active")
      .eq("role", "student");

    if (!members || members.length === 0) {
      return NextResponse.json({
        students: [],
        topics: topics.map((t) => ({
          id: t.id,
          name: t.title,
          description: t.description,
        })),
        class_averages: [],
        has_structure: true,
      } satisfies LearningOutcomesResponse);
    }

    const studentIds = members.map((m) => m.user_id);

    // Get conversations for these students in the period
    const { data: conversations } = await adminClient
      .from("conversations")
      .select("id, user_id")
      .in("user_id", studentIds)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (!conversations || conversations.length === 0) {
      // No conversations, all students have no data
      const topicInfos = topics.map((t) => ({
        id: t.id,
        name: t.title,
        description: t.description,
      }));

      const students: StudentOutcome[] = members.map((m) => ({
        id: m.user_id,
        name: m.display_name || "Anonymous",
        email: ((m.users as unknown) as { email: string })?.email || "",
        topics: topics.map((t) => ({
          topic_id: t.id,
          message_count: 0,
          avg_bloom: 0,
          score: 0,
          status: 'no_data' as TopicStatus,
        })),
        overall_score: 0,
      }));

      return NextResponse.json({
        students,
        topics: topicInfos,
        class_averages: topics.map((t) => ({
          topic_id: t.id,
          avg_score: 0,
          std_dev: 0,
        })),
        has_structure: true,
      } satisfies LearningOutcomesResponse);
    }

    // Create a map of conversation to user
    const conversationToUser = new Map<string, string>();
    for (const c of conversations) {
      conversationToUser.set(c.id, c.user_id);
    }
    const conversationIds = conversations.map((c) => c.id);

    // Get user messages
    const { data: messages } = await adminClient
      .from("messages")
      .select("id, conversation_id")
      .in("conversation_id", conversationIds)
      .eq("role", "user");

    if (!messages || messages.length === 0) {
      const topicInfos = topics.map((t) => ({
        id: t.id,
        name: t.title,
        description: t.description,
      }));

      const students: StudentOutcome[] = members.map((m) => ({
        id: m.user_id,
        name: m.display_name || "Anonymous",
        email: ((m.users as unknown) as { email: string })?.email || "",
        topics: topics.map((t) => ({
          topic_id: t.id,
          message_count: 0,
          avg_bloom: 0,
          score: 0,
          status: 'no_data' as TopicStatus,
        })),
        overall_score: 0,
      }));

      return NextResponse.json({
        students,
        topics: topicInfos,
        class_averages: topics.map((t) => ({
          topic_id: t.id,
          avg_score: 0,
          std_dev: 0,
        })),
        has_structure: true,
      } satisfies LearningOutcomesResponse);
    }

    const messageIds = messages.map((m) => m.id);
    const messageToUser = new Map<string, string>();
    for (const m of messages) {
      const userId = conversationToUser.get(m.conversation_id);
      if (userId) {
        messageToUser.set(m.id, userId);
      }
    }

    // Get prompt analysis for these messages
    const { data: analysis } = await adminClient
      .from("prompt_analysis")
      .select("message_id, matched_topic_id, bloom_level")
      .in("message_id", messageIds);

    // Build student × topic stats
    // Map: studentId -> topicId -> { count, bloomSum, bloomCount }
    const studentTopicStats = new Map<
      string,
      Map<string, { count: number; bloomSum: number; bloomCount: number }>
    >();

    // Initialize for all students and topics
    for (const member of members) {
      const topicMap = new Map<string, { count: number; bloomSum: number; bloomCount: number }>();
      for (const topic of topics) {
        topicMap.set(topic.id, { count: 0, bloomSum: 0, bloomCount: 0 });
      }
      studentTopicStats.set(member.user_id, topicMap);
    }

    // Process analysis data
    for (const a of analysis || []) {
      const userId = messageToUser.get(a.message_id);
      if (!userId) continue;

      const topicId = a.matched_topic_id;
      if (!topicId) continue;

      const studentMap = studentTopicStats.get(userId);
      if (!studentMap) continue;

      const stats = studentMap.get(topicId);
      if (!stats) continue;

      stats.count++;
      if (a.bloom_level && a.bloom_level in BLOOM_TO_NUM) {
        stats.bloomSum += BLOOM_TO_NUM[a.bloom_level as BloomLevel];
        stats.bloomCount++;
      }
    }

    // Calculate scores for each student × topic
    // First, find max messages per topic across all students (for normalization)
    const maxMessagesPerTopic = new Map<string, number>();
    for (const topic of topics) {
      let maxCount = 0;
      for (const [, topicMap] of studentTopicStats) {
        const stats = topicMap.get(topic.id);
        if (stats && stats.count > maxCount) {
          maxCount = stats.count;
        }
      }
      maxMessagesPerTopic.set(topic.id, Math.max(maxCount, 1)); // Avoid division by zero
    }

    // Calculate raw scores for each student × topic
    type StudentScoreData = {
      userId: string;
      topicScores: Map<string, { score: number; messageCount: number; avgBloom: number }>;
    };

    const studentScores: StudentScoreData[] = [];

    for (const member of members) {
      const topicMap = studentTopicStats.get(member.user_id)!;
      const topicScores = new Map<string, { score: number; messageCount: number; avgBloom: number }>();

      for (const topic of topics) {
        const stats = topicMap.get(topic.id)!;
        const maxMessages = maxMessagesPerTopic.get(topic.id)!;

        const messageRatio = stats.count / maxMessages;
        const avgBloom = stats.bloomCount > 0 ? stats.bloomSum / stats.bloomCount : 0;
        const bloomRatio = avgBloom / 6; // Max Bloom level is 6

        // Score formula: 0.4 × (messages / max_messages) + 0.6 × (avg_bloom / 6)
        const score = stats.count === 0 ? 0 : 0.4 * messageRatio + 0.6 * bloomRatio;

        topicScores.set(topic.id, {
          score,
          messageCount: stats.count,
          avgBloom,
        });
      }

      studentScores.push({ userId: member.user_id, topicScores });
    }

    // Calculate class averages and std dev per topic
    const classAverages: ClassAverage[] = [];

    for (const topic of topics) {
      const scores: number[] = [];
      for (const student of studentScores) {
        const scoreData = student.topicScores.get(topic.id);
        if (scoreData && scoreData.messageCount > 0) {
          scores.push(scoreData.score);
        }
      }

      if (scores.length === 0) {
        classAverages.push({
          topic_id: topic.id,
          avg_score: 0,
          std_dev: 0,
        });
      } else {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance =
          scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        classAverages.push({
          topic_id: topic.id,
          avg_score: avgScore,
          std_dev: stdDev,
        });
      }
    }

    // Build avg map for quick lookup
    const avgMap = new Map<string, { avg: number; stdDev: number }>();
    for (const ca of classAverages) {
      avgMap.set(ca.topic_id, { avg: ca.avg_score, stdDev: ca.std_dev });
    }

    // Build final student outcomes with status
    const students: StudentOutcome[] = members.map((m) => {
      const studentScore = studentScores.find((s) => s.userId === m.user_id);
      const topicResults: StudentTopicScore[] = [];
      let totalScore = 0;
      let topicsWithData = 0;

      for (const topic of topics) {
        const scoreData = studentScore?.topicScores.get(topic.id);
        const avgData = avgMap.get(topic.id);

        if (!scoreData || scoreData.messageCount === 0) {
          topicResults.push({
            topic_id: topic.id,
            message_count: 0,
            avg_bloom: 0,
            score: 0,
            status: 'no_data',
          });
        } else {
          const score = scoreData.score;
          const avg = avgData?.avg || 0;
          const stdDev = avgData?.stdDev || 0;

          // Determine status based on score vs class average
          let status: TopicStatus;
          if (score > avg + 0.5 * stdDev) {
            status = 'strong';
          } else if (score < avg - 0.5 * stdDev) {
            status = 'needs_attention';
          } else {
            status = 'on_track';
          }

          topicResults.push({
            topic_id: topic.id,
            message_count: scoreData.messageCount,
            avg_bloom: Math.round(scoreData.avgBloom * 100) / 100,
            score: Math.round(score * 1000) / 1000,
            status,
          });

          totalScore += score;
          topicsWithData++;
        }
      }

      const overallScore = topicsWithData > 0 ? totalScore / topicsWithData : 0;

      return {
        id: m.user_id,
        name: m.display_name || "Anonymous",
        email: ((m.users as unknown) as { email: string })?.email || "",
        topics: topicResults,
        overall_score: Math.round(overallScore * 1000) / 1000,
      };
    });

    // Sort students by overall score (descending)
    students.sort((a, b) => b.overall_score - a.overall_score);

    return NextResponse.json({
      students,
      topics: topics.map((t) => ({
        id: t.id,
        name: t.title,
        description: t.description,
      })),
      class_averages: classAverages,
      has_structure: true,
    } satisfies LearningOutcomesResponse);
  } catch (error) {
    console.error("Learning outcomes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
