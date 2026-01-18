// Test organization credit system
// Run with: npx tsx scripts/test-org-credits.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Simple .env.local parser
function loadEnv() {
  try {
    const envFile = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    envFile.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        process.env[key.trim()] = value.replace(/^["']|["']$/g, "");
      }
    });
  } catch {
    console.error("Could not load .env.local");
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOrgCredits() {
  console.log("Testing organization credit system...\n");

  // Get test org
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", "test-univ")
    .single();

  if (!org) {
    console.error("❌ Test organization not found. Run test-org-setup.ts first.");
    return;
  }

  console.log("✅ Test organization found:", org.name);
  console.log("   Credit balance:", org.credit_balance);

  // Get a test user (first user in the system)
  const { data: testUser } = await supabase
    .from("profiles")
    .select("id, email")
    .limit(1)
    .single();

  if (!testUser) {
    console.error("❌ No users found in the system. Please create a user first.");
    return;
  }

  console.log("\n✅ Test user found:", testUser.email);

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", org.id)
    .eq("user_id", testUser.id)
    .single();

  if (existingMember) {
    console.log("   Already a member with role:", existingMember.role);
    console.log("   Credit allocated:", existingMember.credit_allocated);
    console.log("   Credit used:", existingMember.credit_used);
  } else {
    // Add user as org member
    console.log("\nAdding user as organization member...");
    const { data: newMember, error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: testUser.id,
        role: "admin", // Make them admin so they can access /org
        credit_allocated: 20.0,
      })
      .select()
      .single();

    if (memberError) {
      console.error("❌ Error adding member:", memberError.message);
    } else {
      console.log("✅ User added as organization member");
      console.log("   Role:", newMember.role);
      console.log("   Credit allocated:", newMember.credit_allocated);
    }

    // Update org's allocated credits
    await supabase
      .from("organizations")
      .update({ credit_allocated: org.credit_allocated + 20.0 })
      .eq("id", org.id);
  }

  // Test get_user_organization RPC
  console.log("\nTesting get_user_organization RPC...");
  const { data: userOrg, error: rpcError } = await supabase.rpc(
    "get_user_organization",
    { p_user_id: testUser.id }
  );

  if (rpcError) {
    console.error("❌ RPC error:", rpcError.message);
  } else if (userOrg && userOrg.length > 0) {
    console.log("✅ get_user_organization works!");
    console.log("   Organization:", userOrg[0].organization_name);
    console.log("   Role:", userOrg[0].role);
    console.log("   Credit remaining:", userOrg[0].credit_remaining);
  } else {
    console.log("   No organization membership found");
  }

  // Test check_org_member_limits RPC
  console.log("\nTesting check_org_member_limits RPC...");
  const { data: limitCheck, error: limitError } = await supabase.rpc(
    "check_org_member_limits",
    { p_user_id: testUser.id, p_amount: 0.5 }
  );

  if (limitError) {
    console.error("❌ Limit check error:", limitError.message);
  } else {
    console.log("✅ check_org_member_limits works!");
    console.log("   Result:", JSON.stringify(limitCheck, null, 2));
  }

  // Test record_org_member_usage RPC (small amount)
  console.log("\nTesting record_org_member_usage RPC (0.01€)...");
  const { data: usageResult, error: usageError } = await supabase.rpc(
    "record_org_member_usage",
    { p_user_id: testUser.id, p_amount: 0.01 }
  );

  if (usageError) {
    console.error("❌ Usage recording error:", usageError.message);
  } else {
    console.log("✅ record_org_member_usage works!");
    console.log("   Result:", JSON.stringify(usageResult, null, 2));
  }

  // Get updated member info
  const { data: updatedMember } = await supabase
    .from("organization_members")
    .select("credit_allocated, credit_used")
    .eq("organization_id", org.id)
    .eq("user_id", testUser.id)
    .single();

  if (updatedMember) {
    console.log("\nUpdated member credits:");
    console.log("   Credit allocated:", updatedMember.credit_allocated);
    console.log("   Credit used:", updatedMember.credit_used);
    console.log("   Credit remaining:", updatedMember.credit_allocated - updatedMember.credit_used);
  }

  console.log("\n========================================");
  console.log("Organization credit system test complete!");
  console.log("========================================");
  console.log("\nYou can now:");
  console.log(`1. Login with ${testUser.email}`);
  console.log("2. Go to http://localhost:3001/org to access the org dashboard");
  console.log("3. Use the chat - it should use organization credits");
}

testOrgCredits().catch(console.error);
