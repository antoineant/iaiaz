import { createAdminClient } from "@/lib/supabase/admin";
import {
  analyzePrompts,
  calculateAverageNLPScore,
  type PromptAnalysisResult,
} from "./prompt-analyzer";

// Types
export type Quadrant = "ideal" | "train_ai" | "at_risk" | "superficial";

export interface StudentMetrics {
  userId: string;
  name: string;
  totalMessages: number;
  totalConversations: number;
  totalCost: number;
  activeDays: number;
  avgPromptLength: number;
  followUpRate: number;
  modelDiversity: number;
  sessionCount: number;
  avgMessagesPerSession: number;
  consistencyScore: number;
  messageIds: string[]; // Track message IDs for NLP analysis
}

export interface StudentAnalytics extends StudentMetrics {
  aiLiteracyScore: number;
  domainEngagementScore: number;
  quadrant: Quadrant;
  nlpScore?: number; // Average NLP quality score (0-100), if analyzed
}

export interface ClassAverages {
  avgConversations: number;
  avgMessages: number;
  avgSessions: number;
  avgPromptLength: number;
}

export interface QuadrantSummary {
  quadrant: Quadrant;
  count: number;
  students: Array<{
    userId: string;
    name: string;
    aiLiteracyScore: number;
    domainEngagementScore: number;
    totalMessages: number;
  }>;
}

export interface StudentMatrixData {
  totalStudents: number;
  periodDays: number;
  quadrants: QuadrantSummary[];
  students: StudentAnalytics[];
  classAverages: ClassAverages;
}

/**
 * Compute AI Literacy score based on available signals
 * Scale: 0-100
 *
 * Phase 2: If NLP analysis is available, it accounts for 50% of the score
 * Phase 1 fallback: Uses heuristics only (prompt length, follow-up rate, etc.)
 */
export function computeAILiteracyScore(
  student: StudentMetrics,
  classAvg: ClassAverages,
  nlpScore?: number | null
): number {
  // Prompt length score
  // Longer prompts generally indicate more specific, thoughtful questions
  let lengthScore = 0;
  if (student.avgPromptLength < 20) lengthScore = 20;
  else if (student.avgPromptLength < 50) lengthScore = 50;
  else if (student.avgPromptLength < 100) lengthScore = 75;
  else lengthScore = 100;

  // Follow-up rate score
  // Students who iterate on conversations show better AI usage
  const followUpScore = Math.min(100, student.followUpRate * 100);

  // Model diversity score
  // Using different models shows awareness of model strengths
  let diversityScore = 0;
  if (student.modelDiversity === 1) diversityScore = 30;
  else if (student.modelDiversity === 2) diversityScore = 60;
  else if (student.modelDiversity >= 3) diversityScore = 100;

  // Activity relative to class
  // Being more active than average indicates engagement with AI
  const activityScore =
    classAvg.avgConversations > 0
      ? Math.min(100, (student.totalConversations / classAvg.avgConversations) * 50)
      : 50;

  // If NLP score is available (Phase 2), use weighted formula
  if (nlpScore !== undefined && nlpScore !== null) {
    // Phase 2 weights: NLP 50%, follow-up 20%, diversity 15%, activity 15%
    const score =
      nlpScore * 0.5 +
      followUpScore * 0.2 +
      diversityScore * 0.15 +
      activityScore * 0.15;

    return Math.round(score * 100) / 100;
  }

  // Phase 1 fallback: heuristics only
  // Weights: length 30%, follow-up 30%, diversity 20%, activity 20%
  const score =
    lengthScore * 0.3 +
    followUpScore * 0.3 +
    diversityScore * 0.2 +
    activityScore * 0.2;

  return Math.round(score * 100) / 100;
}

/**
 * Compute Domain Engagement score based on activity patterns
 * Scale: 0-100
 */
export function computeDomainEngagementScore(
  student: StudentMetrics,
  classAvg: ClassAverages,
  periodDays: number
): number {
  // Active days ratio (40%)
  // Regular usage indicates sustained engagement with subject matter
  const activeDaysScore = (student.activeDays / Math.max(1, periodDays)) * 100;

  // Session count relative to class (30%)
  const sessionScore =
    classAvg.avgSessions > 0
      ? Math.min(100, (student.sessionCount / classAvg.avgSessions) * 50)
      : 50;

  // Consistency score (30%)
  // Already computed based on usage regularity
  const consistencyScore = student.consistencyScore;

  const score =
    activeDaysScore * 0.4 + sessionScore * 0.3 + consistencyScore * 0.3;

  return Math.round(score * 100) / 100;
}

/**
 * Assign quadrant based on scores
 * Threshold is 50 (middle of 0-100 scale)
 */
export function assignQuadrant(
  aiScore: number,
  domainScore: number
): Quadrant {
  const threshold = 50;

  if (aiScore >= threshold && domainScore >= threshold) return "ideal";
  if (aiScore < threshold && domainScore >= threshold) return "train_ai";
  if (aiScore >= threshold && domainScore < threshold) return "superficial";
  return "at_risk";
}

/**
 * Compute metrics for all students in a class
 */
export async function computeClassStudentMetrics(
  classId: string,
  periodDays: number = 30
): Promise<StudentMatrixData> {
  const adminClient = createAdminClient();

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Get all students in this class
  const { data: members } = await adminClient
    .from("organization_members")
    .select("user_id, display_name")
    .eq("class_id", classId)
    .eq("status", "active")
    .eq("role", "student");

  if (!members || members.length === 0) {
    return {
      totalStudents: 0,
      periodDays,
      quadrants: [],
      students: [],
      classAverages: {
        avgConversations: 0,
        avgMessages: 0,
        avgSessions: 0,
        avgPromptLength: 0,
      },
    };
  }

  const studentIds = members.map((m) => m.user_id);

  // Get profiles for display names
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, display_name, email")
    .in("id", studentIds);

  const profileMap = new Map(
    profiles?.map((p) => [
      p.id,
      p.display_name || p.email?.split("@")[0] || "Unknown",
    ]) || []
  );

  // Get member display names as fallback
  const memberNameMap = new Map(
    members.map((m) => [m.user_id, m.display_name])
  );

  // Get all conversations for class students in the period
  const { data: conversations } = await adminClient
    .from("conversations")
    .select("id, user_id, model, created_at")
    .in("user_id", studentIds)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (!conversations || conversations.length === 0) {
    // No activity - all students at risk
    const students: StudentAnalytics[] = studentIds.map((userId) => ({
      userId,
      name: profileMap.get(userId) || memberNameMap.get(userId) || "Unknown",
      totalMessages: 0,
      totalConversations: 0,
      totalCost: 0,
      activeDays: 0,
      avgPromptLength: 0,
      followUpRate: 0,
      modelDiversity: 0,
      sessionCount: 0,
      avgMessagesPerSession: 0,
      consistencyScore: 0,
      messageIds: [],
      aiLiteracyScore: 0,
      domainEngagementScore: 0,
      quadrant: "at_risk" as Quadrant,
    }));

    return {
      totalStudents: studentIds.length,
      periodDays,
      quadrants: [
        {
          quadrant: "at_risk",
          count: studentIds.length,
          students: students.map((s) => ({
            userId: s.userId,
            name: s.name,
            aiLiteracyScore: 0,
            domainEngagementScore: 0,
            totalMessages: 0,
          })),
        },
      ],
      students,
      classAverages: {
        avgConversations: 0,
        avgMessages: 0,
        avgSessions: 0,
        avgPromptLength: 0,
      },
    };
  }

  const conversationIds = conversations.map((c) => c.id);

  // Get all messages from those conversations
  const { data: messages } = await adminClient
    .from("messages")
    .select("id, conversation_id, role, content, cost, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  // Build per-student metrics
  const studentMetricsMap = new Map<string, StudentMetrics>();

  // Initialize all students
  for (const userId of studentIds) {
    studentMetricsMap.set(userId, {
      userId,
      name: profileMap.get(userId) || memberNameMap.get(userId) || "Unknown",
      totalMessages: 0,
      totalConversations: 0,
      totalCost: 0,
      activeDays: 0,
      avgPromptLength: 0,
      followUpRate: 0,
      modelDiversity: 0,
      sessionCount: 0,
      avgMessagesPerSession: 0,
      consistencyScore: 50,
      messageIds: [],
    });
  }

  // Build conversation to user mapping
  const convUserMap = new Map(conversations.map((c) => [c.id, c.user_id]));
  const convModelMap = new Map(conversations.map((c) => [c.id, c.model]));

  // Track per-student data
  const studentConversations = new Map<string, Set<string>>();
  const studentModels = new Map<string, Set<string>>();
  const studentActiveDays = new Map<string, Set<string>>();
  const studentPromptLengths = new Map<string, number[]>();
  const studentConvMessageCounts = new Map<string, Map<string, number>>();

  for (const userId of studentIds) {
    studentConversations.set(userId, new Set());
    studentModels.set(userId, new Set());
    studentActiveDays.set(userId, new Set());
    studentPromptLengths.set(userId, []);
    studentConvMessageCounts.set(userId, new Map());
  }

  // Process messages
  for (const msg of messages || []) {
    const userId = convUserMap.get(msg.conversation_id);
    if (!userId) continue;

    const metrics = studentMetricsMap.get(userId);
    if (!metrics) continue;

    // Track conversation
    studentConversations.get(userId)?.add(msg.conversation_id);

    // Track model
    const model = convModelMap.get(msg.conversation_id);
    if (model) studentModels.get(userId)?.add(model);

    // Track active day
    const dateKey = msg.created_at.split("T")[0];
    studentActiveDays.get(userId)?.add(dateKey);

    if (msg.role === "user") {
      metrics.totalMessages++;
      metrics.messageIds.push(msg.id); // Track message ID for NLP analysis
      studentPromptLengths.get(userId)?.push(msg.content?.length || 0);

      // Track messages per conversation for follow-up rate
      const convCounts = studentConvMessageCounts.get(userId);
      if (convCounts) {
        convCounts.set(
          msg.conversation_id,
          (convCounts.get(msg.conversation_id) || 0) + 1
        );
      }
    }

    if (msg.cost) {
      metrics.totalCost += msg.cost;
    }
  }

  // Finalize metrics for each student
  for (const [userId, metrics] of studentMetricsMap) {
    metrics.totalConversations = studentConversations.get(userId)?.size || 0;
    metrics.modelDiversity = studentModels.get(userId)?.size || 0;
    metrics.activeDays = studentActiveDays.get(userId)?.size || 0;

    const promptLengths = studentPromptLengths.get(userId) || [];
    metrics.avgPromptLength =
      promptLengths.length > 0
        ? Math.round(
            promptLengths.reduce((a, b) => a + b, 0) / promptLengths.length
          )
        : 0;

    // Calculate follow-up rate
    const convCounts = studentConvMessageCounts.get(userId);
    if (convCounts && convCounts.size > 0) {
      const convsWithFollowup = Array.from(convCounts.values()).filter(
        (count) => count > 2
      ).length;
      metrics.followUpRate = convsWithFollowup / convCounts.size;
    }

    // Session count = number of active days (simplification for Phase 1)
    metrics.sessionCount = metrics.activeDays;

    // Average messages per session
    metrics.avgMessagesPerSession =
      metrics.sessionCount > 0
        ? metrics.totalMessages / metrics.sessionCount
        : 0;

    // Consistency score: based on how spread out the activity is
    // Higher score = more consistent (regular) usage
    if (metrics.activeDays > 0 && periodDays > 0) {
      const expectedDaysPerWeek = 3; // Expect ~3 active days per week
      const expectedDays = (periodDays / 7) * expectedDaysPerWeek;
      const ratio = Math.min(1, metrics.activeDays / expectedDays);
      metrics.consistencyScore = Math.round(ratio * 100);
    } else {
      metrics.consistencyScore = 0;
    }
  }

  // Calculate class averages
  const allMetrics = Array.from(studentMetricsMap.values());
  const activeStudents = allMetrics.filter((m) => m.totalMessages > 0);

  const classAverages: ClassAverages = {
    avgConversations:
      activeStudents.length > 0
        ? activeStudents.reduce((sum, m) => sum + m.totalConversations, 0) /
          activeStudents.length
        : 0,
    avgMessages:
      activeStudents.length > 0
        ? activeStudents.reduce((sum, m) => sum + m.totalMessages, 0) /
          activeStudents.length
        : 0,
    avgSessions:
      activeStudents.length > 0
        ? activeStudents.reduce((sum, m) => sum + m.sessionCount, 0) /
          activeStudents.length
        : 0,
    avgPromptLength:
      activeStudents.length > 0
        ? activeStudents.reduce((sum, m) => sum + m.avgPromptLength, 0) /
          activeStudents.length
        : 0,
  };

  // Compute scores and assign quadrants
  const studentsWithScores: StudentAnalytics[] = allMetrics.map((metrics) => {
    const aiLiteracyScore = computeAILiteracyScore(metrics, classAverages);
    const domainEngagementScore = computeDomainEngagementScore(
      metrics,
      classAverages,
      periodDays
    );
    const quadrant = assignQuadrant(aiLiteracyScore, domainEngagementScore);

    return {
      ...metrics,
      aiLiteracyScore,
      domainEngagementScore,
      quadrant,
    };
  });

  // Group by quadrant
  const quadrantGroups = new Map<Quadrant, StudentAnalytics[]>();
  for (const student of studentsWithScores) {
    const group = quadrantGroups.get(student.quadrant) || [];
    group.push(student);
    quadrantGroups.set(student.quadrant, group);
  }

  const quadrants: QuadrantSummary[] = (
    ["ideal", "train_ai", "at_risk", "superficial"] as Quadrant[]
  ).map((q) => {
    const students = quadrantGroups.get(q) || [];
    return {
      quadrant: q,
      count: students.length,
      students: students.map((s) => ({
        userId: s.userId,
        name: s.name,
        aiLiteracyScore: s.aiLiteracyScore,
        domainEngagementScore: s.domainEngagementScore,
        totalMessages: s.totalMessages,
      })),
    };
  });

  return {
    totalStudents: studentIds.length,
    periodDays,
    quadrants,
    students: studentsWithScores,
    classAverages,
  };
}

/**
 * Store computed analytics in the database
 */
export async function storeStudentAnalytics(
  classId: string,
  periodDays: number,
  students: StudentAnalytics[]
): Promise<void> {
  const adminClient = createAdminClient();

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const records = students.map((s) => ({
    user_id: s.userId,
    class_id: classId,
    period_start: startDate.toISOString().split("T")[0],
    period_end: endDate.toISOString().split("T")[0],
    total_messages: s.totalMessages,
    total_conversations: s.totalConversations,
    total_cost: s.totalCost,
    active_days: s.activeDays,
    avg_prompt_length: s.avgPromptLength,
    follow_up_rate: s.followUpRate,
    model_diversity: s.modelDiversity,
    ai_literacy_score: s.aiLiteracyScore,
    session_count: s.sessionCount,
    avg_messages_per_session: s.avgMessagesPerSession,
    consistency_score: s.consistencyScore,
    domain_engagement_score: s.domainEngagementScore,
    quadrant: s.quadrant,
    updated_at: new Date().toISOString(),
  }));

  // Upsert all records
  for (const record of records) {
    await adminClient.from("student_analytics").upsert(record, {
      onConflict: "user_id,class_id,period_start",
    });
  }
}

/**
 * Get cached student analytics for a class
 */
export async function getStoredStudentAnalytics(
  classId: string,
  periodDays: number = 30
): Promise<StudentMatrixData | null> {
  const adminClient = createAdminClient();

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const periodStart = startDate.toISOString().split("T")[0];

  const { data, error } = await adminClient
    .from("student_analytics")
    .select(`
      user_id,
      total_messages,
      total_conversations,
      total_cost,
      active_days,
      avg_prompt_length,
      follow_up_rate,
      model_diversity,
      ai_literacy_score,
      session_count,
      avg_messages_per_session,
      consistency_score,
      domain_engagement_score,
      quadrant,
      profiles!inner(display_name, email)
    `)
    .eq("class_id", classId)
    .eq("period_start", periodStart);

  if (error || !data || data.length === 0) {
    return null;
  }

  // Transform to StudentAnalytics format
  const students: StudentAnalytics[] = data.map((row) => {
    const profile = row.profiles as unknown as { display_name: string | null; email: string };
    return {
      userId: row.user_id,
      name: profile?.display_name || profile?.email?.split("@")[0] || "Unknown",
      totalMessages: row.total_messages,
      totalConversations: row.total_conversations,
      totalCost: row.total_cost,
      activeDays: row.active_days,
      avgPromptLength: row.avg_prompt_length,
      followUpRate: row.follow_up_rate,
      modelDiversity: row.model_diversity,
      sessionCount: row.session_count,
      avgMessagesPerSession: row.avg_messages_per_session,
      consistencyScore: row.consistency_score,
      messageIds: [], // Not stored in cache, empty for cached data
      aiLiteracyScore: row.ai_literacy_score,
      domainEngagementScore: row.domain_engagement_score,
      quadrant: row.quadrant as Quadrant,
    };
  });

  // Group by quadrant
  const quadrantGroups = new Map<Quadrant, StudentAnalytics[]>();
  for (const student of students) {
    const group = quadrantGroups.get(student.quadrant) || [];
    group.push(student);
    quadrantGroups.set(student.quadrant, group);
  }

  const quadrants: QuadrantSummary[] = (
    ["ideal", "train_ai", "at_risk", "superficial"] as Quadrant[]
  ).map((q) => {
    const qStudents = quadrantGroups.get(q) || [];
    return {
      quadrant: q,
      count: qStudents.length,
      students: qStudents.map((s) => ({
        userId: s.userId,
        name: s.name,
        aiLiteracyScore: s.aiLiteracyScore,
        domainEngagementScore: s.domainEngagementScore,
        totalMessages: s.totalMessages,
      })),
    };
  });

  // Calculate class averages from stored data
  const activeStudents = students.filter((m) => m.totalMessages > 0);
  const classAverages: ClassAverages = {
    avgConversations:
      activeStudents.length > 0
        ? activeStudents.reduce((sum, m) => sum + m.totalConversations, 0) /
          activeStudents.length
        : 0,
    avgMessages:
      activeStudents.length > 0
        ? activeStudents.reduce((sum, m) => sum + m.totalMessages, 0) /
          activeStudents.length
        : 0,
    avgSessions:
      activeStudents.length > 0
        ? activeStudents.reduce((sum, m) => sum + m.sessionCount, 0) /
          activeStudents.length
        : 0,
    avgPromptLength:
      activeStudents.length > 0
        ? activeStudents.reduce((sum, m) => sum + m.avgPromptLength, 0) /
          activeStudents.length
        : 0,
  };

  return {
    totalStudents: students.length,
    periodDays,
    quadrants,
    students,
    classAverages,
  };
}

/**
 * Compute class student metrics with NLP analysis (Phase 2)
 * This function:
 * 1. Computes basic metrics
 * 2. Analyzes prompts using LLM (on-demand, cached)
 * 3. Recalculates AI Literacy scores using NLP analysis
 */
export async function computeClassStudentMetricsWithNLP(
  classId: string,
  periodDays: number = 30,
  enableNLP: boolean = true
): Promise<StudentMatrixData> {
  const adminClient = createAdminClient();

  // First, compute basic metrics
  const basicMetrics = await computeClassStudentMetrics(classId, periodDays);

  if (!enableNLP || basicMetrics.students.length === 0) {
    return basicMetrics;
  }

  // Collect all user messages that need analysis
  const allMessageIds = basicMetrics.students.flatMap((s) => s.messageIds);

  if (allMessageIds.length === 0) {
    return basicMetrics;
  }

  // Fetch message content for analysis
  const { data: messages } = await adminClient
    .from("messages")
    .select("id, content")
    .in("id", allMessageIds)
    .eq("role", "user");

  if (!messages || messages.length === 0) {
    return basicMetrics;
  }

  // Analyze prompts (will use cache for already-analyzed ones)
  // Pass classId to enable topic matching for "progression pédagogique"
  const promptsToAnalyze = messages.map((m) => ({
    id: m.id,
    content: m.content || "",
  }));

  const nlpAnalysis = await analyzePrompts(promptsToAnalyze, classId);

  // Recalculate AI Literacy scores with NLP
  const studentsWithNLP: StudentAnalytics[] = basicMetrics.students.map(
    (student) => {
      const nlpScore = calculateAverageNLPScore(student.messageIds, nlpAnalysis);

      // Recalculate AI Literacy score with NLP
      const aiLiteracyScore = computeAILiteracyScore(
        student,
        basicMetrics.classAverages,
        nlpScore
      );

      const quadrant = assignQuadrant(
        aiLiteracyScore,
        student.domainEngagementScore
      );

      return {
        ...student,
        aiLiteracyScore,
        quadrant,
        nlpScore: nlpScore ?? undefined,
      };
    }
  );

  // Regroup by quadrant
  const quadrantGroups = new Map<Quadrant, StudentAnalytics[]>();
  for (const student of studentsWithNLP) {
    const group = quadrantGroups.get(student.quadrant) || [];
    group.push(student);
    quadrantGroups.set(student.quadrant, group);
  }

  const quadrants: QuadrantSummary[] = (
    ["ideal", "train_ai", "at_risk", "superficial"] as Quadrant[]
  ).map((q) => {
    const qStudents = quadrantGroups.get(q) || [];
    return {
      quadrant: q,
      count: qStudents.length,
      students: qStudents.map((s) => ({
        userId: s.userId,
        name: s.name,
        aiLiteracyScore: s.aiLiteracyScore,
        domainEngagementScore: s.domainEngagementScore,
        totalMessages: s.totalMessages,
      })),
    };
  });

  return {
    totalStudents: basicMetrics.totalStudents,
    periodDays,
    quadrants,
    students: studentsWithNLP,
    classAverages: basicMetrics.classAverages,
  };
}
