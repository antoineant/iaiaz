// Run a migration file
// Usage: npx tsx scripts/run-migration.ts <migration-file>

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

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error("Usage: npx tsx scripts/run-migration.ts <migration-file>");
    process.exit(1);
  }

  const sqlPath = join(process.cwd(), "supabase/migrations", migrationFile);
  const sql = readFileSync(sqlPath, "utf8");

  console.log(`Running migration: ${migrationFile}`);

  const { error } = await supabase.rpc("exec_sql", { sql_text: sql });

  if (error) {
    // If exec_sql doesn't exist, we need to run via REST API
    console.log("Direct execution not available. Please run in Supabase Dashboard SQL Editor:");
    console.log("---");
    console.log(sql);
    console.log("---");
    process.exit(1);
  }

  console.log("Migration completed successfully!");
}

runMigration().catch(console.error);
