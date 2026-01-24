/**
 * Generate mock data for testing the student analytics matrix
 *
 * Usage: npx tsx scripts/generate-mock-analytics.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Student profiles to simulate different quadrants
const studentProfiles = [
  // IDEAL students - high AI literacy, high engagement
  { name: "Alice Martin", aiSkill: "high", engagement: "high" },
  { name: "Bob Dupont", aiSkill: "high", engagement: "high" },
  { name: "Claire Bernard", aiSkill: "high", engagement: "high" },

  // TRAIN_AI students - low AI literacy, high engagement
  { name: "David Petit", aiSkill: "low", engagement: "high" },
  { name: "Emma Roux", aiSkill: "low", engagement: "high" },

  // AT_RISK students - low AI literacy, low engagement
  { name: "François Leroy", aiSkill: "low", engagement: "low" },
  { name: "Giselle Moreau", aiSkill: "low", engagement: "low" },
  { name: "Henri Simon", aiSkill: "low", engagement: "low" },

  // SUPERFICIAL students - high AI literacy, low engagement
  { name: "Isabelle Laurent", aiSkill: "high", engagement: "low" },
];

const models = ["gpt-5.1", "claude-sonnet-4-20250514", "gemini-2.0-flash"];

// Sample prompts by skill level
const highSkillPrompts = [
  "Can you explain the key differences between supervised and unsupervised learning, focusing on their applications in natural language processing? Please provide specific examples of algorithms used in each approach.",
  "I'm working on a marketing strategy for a B2B SaaS product. Can you help me create a customer journey map that identifies touchpoints, pain points, and opportunities for engagement at each stage of the funnel?",
  "Compare and contrast the economic theories of Keynes and Friedman, particularly regarding their views on government intervention during economic recessions. How do these theories apply to current monetary policy?",
  "I need to analyze the impact of climate change on supply chain logistics. Can you outline the main risks and propose mitigation strategies for a global manufacturing company?",
  "Help me understand the legal implications of GDPR for a startup collecting user data. What are the key compliance requirements and potential penalties for non-compliance?",
];

const lowSkillPrompts = [
  "what is marketing",
  "explain economics",
  "help with homework",
  "what is AI",
  "tell me about business",
];

async function generateMockData() {
  console.log("🔍 Finding a class to populate with mock data...\n");

  // Find an existing class
  const { data: classes, error: classError } = await supabase
    .from("organization_classes")
    .select(`
      id,
      name,
      organization_id,
      organizations(name)
    `)
    .eq("status", "active")
    .limit(5);

  if (classError || !classes || classes.length === 0) {
    console.error("❌ No active classes found. Please create a class first.");
    process.exit(1);
  }

  console.log("Available classes:");
  classes.forEach((c, i) => {
    const orgName = (c.organizations as { name: string })?.name || "Unknown";
    console.log(`  ${i + 1}. ${c.name} (${orgName})`);
  });

  // Use the first class
  const targetClass = classes[0];
  console.log(`\n✅ Using class: ${targetClass.name}\n`);

  // Check existing students
  const { data: existingMembers } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("class_id", targetClass.id)
    .eq("role", "student");

  const existingStudentIds = existingMembers?.map(m => m.user_id) || [];
  console.log(`Found ${existingStudentIds.length} existing students in class\n`);

  // If no students, create mock student accounts
  let studentUserIds: string[] = existingStudentIds;

  if (studentUserIds.length < 5) {
    console.log("Creating mock student accounts...\n");

    for (let i = 0; i < studentProfiles.length; i++) {
      const profile = studentProfiles[i];
      const email = `mock.student.${i + 1}@test.iaiaz.com`;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) {
        studentUserIds.push(existingUser.id);
        console.log(`  ✓ Found existing: ${profile.name} (${email})`);
        continue;
      }

      // Create user via auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: "MockStudent123!",
        email_confirm: true,
        user_metadata: {
          display_name: profile.name,
          account_type: "student",
        },
      });

      if (authError) {
        console.error(`  ❌ Failed to create ${profile.name}: ${authError.message}`);
        continue;
      }

      studentUserIds.push(authData.user.id);
      console.log(`  ✓ Created: ${profile.name} (${email})`);

      // Add to organization as student
      await supabase.from("organization_members").insert({
        organization_id: targetClass.organization_id,
        user_id: authData.user.id,
        role: "student",
        class_id: targetClass.id,
        status: "active",
        credit_allocated: 5,
        credit_used: 0,
      });
    }
  }

  console.log(`\n📊 Generating conversation data for ${studentUserIds.length} students...\n`);

  // Generate conversations and messages for each student
  const now = new Date();

  for (let i = 0; i < Math.min(studentUserIds.length, studentProfiles.length); i++) {
    const userId = studentUserIds[i];
    const profile = studentProfiles[i];

    // Determine conversation parameters based on profile
    const numConversations = profile.engagement === "high" ? randomInt(8, 15) : randomInt(1, 4);
    const activeDays = profile.engagement === "high" ? randomInt(10, 20) : randomInt(1, 5);
    const prompts = profile.aiSkill === "high" ? highSkillPrompts : lowSkillPrompts;
    const followUpChance = profile.aiSkill === "high" ? 0.7 : 0.2;

    console.log(`  ${profile.name}:`);
    console.log(`    - ${numConversations} conversations over ${activeDays} days`);
    console.log(`    - AI skill: ${profile.aiSkill}, Engagement: ${profile.engagement}`);

    for (let c = 0; c < numConversations; c++) {
      // Random date within last 30 days
      const daysAgo = randomInt(0, 29);
      const convDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Random model (high skill = more diversity)
      const modelIndex = profile.aiSkill === "high" ? randomInt(0, models.length - 1) : 0;
      const model = models[modelIndex];

      // Create conversation
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          title: `Conversation ${c + 1}`,
          model,
          created_at: convDate.toISOString(),
          updated_at: convDate.toISOString(),
        })
        .select()
        .single();

      if (convError || !conv) {
        console.error(`    ❌ Failed to create conversation: ${convError?.message}`);
        continue;
      }

      // Create messages
      const numMessages = Math.random() < followUpChance ? randomInt(4, 8) : randomInt(1, 2);

      for (let m = 0; m < numMessages; m++) {
        const isUser = m % 2 === 0;
        const msgTime = new Date(convDate.getTime() + m * 60000); // 1 min apart

        if (isUser) {
          const prompt = prompts[randomInt(0, prompts.length - 1)];
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            role: "user",
            content: prompt,
            tokens_input: prompt.length,
            tokens_output: 0,
            cost: 0,
            created_at: msgTime.toISOString(),
          });
        } else {
          const response = "This is a mock AI response for testing purposes. " +
            "It simulates the kind of detailed answer a student might receive. ".repeat(3);
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            role: "assistant",
            content: response,
            tokens_input: 0,
            tokens_output: response.length,
            cost: randomFloat(0.001, 0.01),
            created_at: msgTime.toISOString(),
          });
        }
      }
    }
  }

  console.log("\n✅ Mock data generation complete!");
  console.log(`\n📈 You can now view the analytics at:`);
  console.log(`   /org/classes/${targetClass.id}/analytics\n`);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Run
generateMockData().catch(console.error);
