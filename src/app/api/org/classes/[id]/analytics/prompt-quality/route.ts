import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getClassNLPBreakdown,
  getExamplePromptsByTier,
  type NLPBreakdown,
  type ExamplesByTier,
} from "@/lib/analytics/prompt-analyzer";

interface PromptQualityResponse {
  classBreakdown: NLPBreakdown | null;
  examples: ExamplesByTier;
  analyzedCount: number;
  totalMessages: number;
}

/**
 * GET /api/org/classes/[id]/analytics/prompt-quality
 * Returns detailed prompt quality analysis for a class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PromptQualityResponse | { error: string }>> {
  try {
    const { id: classId } = await params;
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user can access this class (owner, admin, or teacher)
    const { data: membership } = await supabase
      .from("organization_members")
      .select(`
        role,
        organization:organizations!inner(
          id,
          organization_classes!inner(id)
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin", "teacher"]);

    const hasAccess = membership?.some((m) => {
      const org = m.organization as unknown as {
        id: string;
        organization_classes: Array<{ id: string }>;
      };
      return org?.organization_classes?.some((c) => c.id === classId);
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - period * 24 * 60 * 60 * 1000);

    // Get all class members
    const { data: members } = await adminClient
      .from("organization_members")
      .select("user_id")
      .eq("class_id", classId)
      .eq("status", "active")
      .eq("role", "student");

    if (!members || members.length === 0) {
      return NextResponse.json({
        classBreakdown: null,
        examples: { low: [], medium: [], high: [] },
        analyzedCount: 0,
        totalMessages: 0,
      });
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
      return NextResponse.json({
        classBreakdown: null,
        examples: { low: [], medium: [], high: [] },
        analyzedCount: 0,
        totalMessages: 0,
      });
    }

    const conversationIds = conversations.map((c) => c.id);

    // Get user messages
    const { data: messages } = await adminClient
      .from("messages")
      .select("id")
      .in("conversation_id", conversationIds)
      .eq("role", "user");

    const messageIds = messages?.map((m) => m.id) || [];
    const totalMessages = messageIds.length;

    // Get class breakdown and examples in parallel
    const [classBreakdown, examples] = await Promise.all([
      getClassNLPBreakdown(classId, period),
      getExamplePromptsByTier(messageIds, 3),
    ]);

    return NextResponse.json({
      classBreakdown,
      examples,
      analyzedCount: classBreakdown?.messageCount || 0,
      totalMessages,
    });
  } catch (error) {
    console.error("Error fetching prompt quality:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt quality data" },
      { status: 500 }
    );
  }
}
