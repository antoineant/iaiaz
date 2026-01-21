import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// GET /api/admin/providers/history - Get historical provider spend
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Parse months parameter (defaults to 12)
  const months = parseInt(searchParams.get("months") || "12");

  const { data, error } = await supabase.rpc("get_provider_spend_history", {
    p_months: months,
  });

  if (error) {
    console.error("Error fetching provider history:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider history" },
      { status: 500 }
    );
  }

  // Group by month for easier charting
  const byMonth: Record<string, Record<string, { spend_eur: number; message_count: number }>> = {};

  for (const row of data || []) {
    if (!byMonth[row.month_year]) {
      byMonth[row.month_year] = {};
    }
    byMonth[row.month_year][row.provider] = {
      spend_eur: Number(row.spend_eur) || 0,
      message_count: Number(row.message_count) || 0,
    };
  }

  return NextResponse.json({
    history: data || [],
    byMonth,
    months,
  });
}
