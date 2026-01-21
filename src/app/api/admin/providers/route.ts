import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// GET /api/admin/providers - Get provider spend for current month
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Parse year/month (defaults to current)
  const now = new Date();
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));

  // Get current month spend per provider
  const { data: currentSpend, error: spendError } = await supabase.rpc(
    "get_provider_monthly_spend",
    { p_year: year, p_month: month }
  );

  if (spendError) {
    console.error("Error fetching provider spend:", spendError);
    return NextResponse.json(
      { error: "Failed to fetch provider spend" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    providers: currentSpend || [],
    period: { year, month },
  });
}
