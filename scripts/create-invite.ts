import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Load env
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

async function main() {
  // Get org
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", "test-univ")
    .single();

  if (!org) {
    console.log("No org found");
    return;
  }

  console.log("Organization:", org.name);

  // Delete old pending invites to avoid confusion
  await supabase
    .from("organization_invites")
    .delete()
    .eq("status", "pending");

  // Create fresh invite
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invite, error } = await supabase
    .from("organization_invites")
    .insert({
      organization_id: org.id,
      email: "newstudent@example.com",
      role: "student",
      class_name: "MBA 2025",
      credit_amount: 10.0,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.log("Error creating invite:", error.message);
    return;
  }

  // Verify it exists
  const { data: verify } = await supabase
    .from("organization_invites")
    .select("token, status, expires_at")
    .eq("id", invite.id)
    .single();

  if (!verify) {
    console.log("Could not verify invite");
    return;
  }

  console.log("\nInvite created successfully!");
  console.log("Token:", verify.token);
  console.log("Status:", verify.status);
  console.log("Expires:", verify.expires_at);
  console.log("\nJoin URL:");
  console.log("http://localhost:3000/join?token=" + verify.token);
}

main().catch(console.error);
