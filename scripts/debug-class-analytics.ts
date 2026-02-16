// Debug script to check class analytics data flow
// Run with: npx tsx --env-file=.env.local scripts/debug-class-analytics.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function debug() {
  console.log("=== Class Analytics Debug ===\n");

  // 1. List all classes
  const { data: classes, error: classError } = await adminClient
    .from("organization_classes")
    .select("id, name, organization_id, status")
    .eq("status", "active");

  if (classError) {
    console.error("Error fetching classes:", classError);
    return;
  }

  console.log(`Found ${classes?.length || 0} active classes:\n`);

  for (const cls of classes || []) {
    console.log(`\n--- Class: ${cls.name} (${cls.id}) ---`);

    // 2. Get students in this class
    const { data: members, error: memberError } = await adminClient
      .from("organization_members")
      .select("id, user_id, role, status, display_name, credit_used")
      .eq("class_id", cls.id);

    if (memberError) {
      console.error("  Error fetching members:", memberError);
      continue;
    }

    console.log(`  Students in class: ${members?.length || 0}`);

    if (!members || members.length === 0) {
      console.log("  No students found in this class");
      continue;
    }

    const studentIds = members.map((m) => m.user_id);
    console.log(`  Student user_ids: ${studentIds.join(", ")}`);

    // 3. Check conversations for these students
    const { data: conversations, error: convError } = await adminClient
      .from("conversations")
      .select("id, user_id, model, created_at, updated_at")
      .in("user_id", studentIds)
      .order("created_at", { ascending: false })
      .limit(10);

    if (convError) {
      console.error("  Error fetching conversations:", convError);
      continue;
    }

    console.log(`\n  Conversations for class students: ${conversations?.length || 0}`);

    if (conversations && conversations.length > 0) {
      for (const conv of conversations.slice(0, 3)) {
        console.log(`    - Conv ${conv.id.slice(0, 8)}... by user ${conv.user_id.slice(0, 8)}... model: ${conv.model}`);

        // Get messages in this conversation
        const { data: messages } = await adminClient
          .from("messages")
          .select("id, role, cost, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        console.log(`      Messages: ${messages?.length || 0}`);
        if (messages && messages.length > 0) {
          const userMsgs = messages.filter((m) => m.role === "user").length;
          const assistantMsgs = messages.filter((m) => m.role === "assistant").length;
          const totalCost = messages.reduce((sum, m) => sum + (m.cost || 0), 0);
          console.log(`      User: ${userMsgs}, Assistant: ${assistantMsgs}, Total cost: €${totalCost.toFixed(4)}`);
        }
      }
    } else {
      console.log("  No conversations found for class students");

      // Check if these users have ANY conversations
      for (const userId of studentIds) {
        const { data: anyConvs } = await adminClient
          .from("conversations")
          .select("id")
          .eq("user_id", userId)
          .limit(1);

        console.log(`    User ${userId.slice(0, 8)}... has ${anyConvs?.length || 0} conversations total`);
      }
    }

    // 4. Check organization_transactions for usage
    const memberIds = members.map((m) => m.id);
    const { data: transactions, error: txError } = await adminClient
      .from("organization_transactions")
      .select("id, type, amount, created_at, member_id")
      .in("member_id", memberIds)
      .eq("type", "usage")
      .order("created_at", { ascending: false })
      .limit(10);

    if (txError) {
      console.error("  Error fetching transactions:", txError);
      continue;
    }

    console.log(`\n  Usage transactions: ${transactions?.length || 0}`);
    if (transactions && transactions.length > 0) {
      const totalUsage = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      console.log(`    Total usage amount: €${totalUsage.toFixed(4)}`);
    }
  }

  console.log("\n=== Debug Complete ===");
}

debug().catch(console.error);
