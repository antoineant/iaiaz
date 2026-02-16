// Test the computeClassMetrics function directly
// Run with: npx tsx --env-file=.env.local scripts/test-compute-metrics.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Recreate the computeClassMetrics logic here for testing
async function testComputeClassMetrics(classId: string) {
  console.log(`\n=== Testing computeClassMetrics for class ${classId} ===\n`);

  // Default to last 30 days
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  console.log(`Date range: ${start.toISOString()} to ${end.toISOString()}`);

  // Get all students in this class
  const { data: members, error: membersError } = await adminClient
    .from("organization_members")
    .select("user_id")
    .eq("class_id", classId)
    .eq("status", "active");

  if (membersError) {
    console.error("Error fetching members:", membersError);
    return;
  }

  const studentIds = members?.map((m) => m.user_id) || [];
  console.log(`\nFound ${studentIds.length} students:`, studentIds);

  if (studentIds.length === 0) {
    console.log("No students found - returning empty metrics");
    return;
  }

  // First, get all conversations for class students
  console.log("\n--- Fetching conversations ---");
  const { data: conversations, error: convError } = await adminClient
    .from("conversations")
    .select("id, user_id, model, created_at, updated_at")
    .in("user_id", studentIds)
    .gte("created_at", start.toISOString())
    .lte("updated_at", end.toISOString());

  if (convError) {
    console.error("Error fetching conversations:", convError);
    return;
  }

  console.log(`Found ${conversations?.length || 0} conversations`);
  if (conversations && conversations.length > 0) {
    for (const c of conversations) {
      console.log(`  - ${c.id} | user: ${c.user_id} | model: ${c.model} | created: ${c.created_at}`);
    }
  }

  if (!conversations || conversations.length === 0) {
    console.log("No conversations found in date range");

    // Debug: check if conversations exist without date filter
    const { data: allConvs } = await adminClient
      .from("conversations")
      .select("id, user_id, model, created_at, updated_at")
      .in("user_id", studentIds);

    console.log(`\nConversations without date filter: ${allConvs?.length || 0}`);
    if (allConvs && allConvs.length > 0) {
      for (const c of allConvs) {
        console.log(`  - ${c.id} | created: ${c.created_at} | updated: ${c.updated_at}`);
      }
    }
    return;
  }

  const conversationIds = conversations.map((c) => c.id);
  const conversationMap = new Map(conversations.map((c) => [c.id, c]));

  // Then get all messages from those conversations within the date range
  console.log("\n--- Fetching messages ---");
  const { data: messages, error: msgError } = await adminClient
    .from("messages")
    .select("id, role, cost, created_at, conversation_id")
    .in("conversation_id", conversationIds)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (msgError) {
    console.error("Error fetching messages:", msgError);
    return;
  }

  console.log(`Found ${messages?.length || 0} messages`);
  if (messages && messages.length > 0) {
    for (const m of messages) {
      console.log(`  - ${m.id.slice(0,8)}... | role: ${m.role} | cost: ${m.cost} | created: ${m.created_at}`);
    }
  }

  // Compute metrics
  let totalMessages = 0;
  let totalCost = 0;
  const activeStudentIds = new Set<string>();

  for (const msg of messages || []) {
    const conv = conversationMap.get(msg.conversation_id);
    if (!conv) continue;

    if (msg.role === "user") {
      totalMessages++;
    }
    if (msg.cost) {
      totalCost += msg.cost;
    }
    activeStudentIds.add(conv.user_id);
  }

  console.log("\n--- Computed Metrics ---");
  console.log(`Total messages (user only): ${totalMessages}`);
  console.log(`Total cost: €${totalCost.toFixed(4)}`);
  console.log(`Active students: ${activeStudentIds.size}`);
  console.log(`Total conversations: ${conversations.length}`);
}

async function main() {
  // Test with the class that has data
  await testComputeClassMetrics("90b1141b-7375-4f05-956c-5cf6c26515df");
}

main().catch(console.error);
