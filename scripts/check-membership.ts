// Check membership status after invite acceptance
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

function loadEnv() {
  const envFile = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  envFile.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Get test org
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, credit_balance, credit_allocated")
    .eq("slug", "test-univ")
    .single();

  console.log("Organization:", org);

  // Get all members
  const { data: members } = await supabase
    .from("organization_members")
    .select("*, profiles(email)")
    .eq("organization_id", org?.id);

  console.log("\nMembers:", JSON.stringify(members, null, 2));

  // Get recent invites
  const { data: invites } = await supabase
    .from("organization_invites")
    .select("id, email, role, credit_amount, status, accepted_at")
    .eq("organization_id", org?.id)
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("\nRecent invites:", JSON.stringify(invites, null, 2));

  // Get recent transactions
  const { data: transactions } = await supabase
    .from("organization_transactions")
    .select("*")
    .eq("organization_id", org?.id)
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("\nRecent transactions:", JSON.stringify(transactions, null, 2));
}

check().catch(console.error);
