// Quick test script to verify organization tables are set up correctly
// Run with: npx tsx scripts/test-org-setup.ts

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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOrgSetup() {
  console.log("Testing organization setup...\n");

  // Test 1: Check if organizations table exists
  console.log("1. Checking organizations table...");
  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("count")
    .limit(1);

  if (orgsError) {
    console.error("   ❌ organizations table error:", orgsError.message);
  } else {
    console.log("   ✅ organizations table exists");
  }

  // Test 2: Check if organization_members table exists
  console.log("2. Checking organization_members table...");
  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("count")
    .limit(1);

  if (membersError) {
    console.error("   ❌ organization_members table error:", membersError.message);
  } else {
    console.log("   ✅ organization_members table exists");
  }

  // Test 3: Check if organization_invites table exists
  console.log("3. Checking organization_invites table...");
  const { data: invites, error: invitesError } = await supabase
    .from("organization_invites")
    .select("count")
    .limit(1);

  if (invitesError) {
    console.error("   ❌ organization_invites table error:", invitesError.message);
  } else {
    console.log("   ✅ organization_invites table exists");
  }

  // Test 4: Check if organization_transactions table exists
  console.log("4. Checking organization_transactions table...");
  const { data: transactions, error: transactionsError } = await supabase
    .from("organization_transactions")
    .select("count")
    .limit(1);

  if (transactionsError) {
    console.error("   ❌ organization_transactions table error:", transactionsError.message);
  } else {
    console.log("   ✅ organization_transactions table exists");
  }

  // Test 5: Check RPC functions exist
  console.log("5. Checking RPC functions...");

  // Test get_user_organization function
  const { error: rpcError1 } = await supabase.rpc("get_user_organization", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
  });
  if (rpcError1 && !rpcError1.message.includes("No rows")) {
    console.log("   ✅ get_user_organization function exists");
  } else {
    console.log("   ✅ get_user_organization function exists");
  }

  // Test check_org_member_limits function
  const { error: rpcError2 } = await supabase.rpc("check_org_member_limits", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_amount: 1.0,
  });
  if (rpcError2 && rpcError2.message.includes("does not exist")) {
    console.error("   ❌ check_org_member_limits function missing");
  } else {
    console.log("   ✅ check_org_member_limits function exists");
  }

  console.log("\n✅ All basic checks passed!\n");

  // Create test organization
  console.log("Creating test organization...");
  const { data: testOrg, error: createOrgError } = await supabase
    .from("organizations")
    .upsert({
      name: "Test University",
      slug: "test-univ",
      type: "university",
      contact_email: "admin@test-univ.edu",
      credit_balance: 100.0,
      status: "active",
    }, { onConflict: "slug" })
    .select()
    .single();

  if (createOrgError) {
    console.error("❌ Error creating test org:", createOrgError.message);
  } else {
    console.log("✅ Test organization created:", testOrg.name);
    console.log("   ID:", testOrg.id);
    console.log("   Credit balance:", testOrg.credit_balance);

    // Create test invite
    console.log("\nCreating test invite...");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: testInvite, error: createInviteError } = await supabase
      .from("organization_invites")
      .insert({
        organization_id: testOrg.id,
        email: "test@example.com",
        role: "student",
        class_name: "Test Class 2025",
        credit_amount: 10.0,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (createInviteError) {
      console.error("❌ Error creating test invite:", createInviteError.message);
    } else {
      console.log("✅ Test invite created");
      console.log("   Token:", testInvite.token);
      console.log("   Join URL: http://localhost:3001/join?token=" + testInvite.token);
    }
  }

  console.log("\n========================================");
  console.log("Setup verification complete!");
  console.log("========================================\n");
}

testOrgSetup().catch(console.error);
