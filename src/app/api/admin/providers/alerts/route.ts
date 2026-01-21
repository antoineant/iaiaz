import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// GET /api/admin/providers/alerts - Get active alerts
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const showAcknowledged = searchParams.get("showAcknowledged") === "true";

  let query = supabase
    .from("provider_budget_alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (!showAcknowledged) {
    query = query.eq("acknowledged", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }

  return NextResponse.json({ alerts: data || [] });
}

// POST /api/admin/providers/alerts - Check and create new alerts
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("check_provider_budget_alerts");

  if (error) {
    console.error("Error checking alerts:", error);
    return NextResponse.json(
      { error: "Failed to check alerts" },
      { status: 500 }
    );
  }

  return NextResponse.json({ newAlerts: data || [] });
}
