import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// GET /api/admin/income - Get income stats with flexible grouping
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Parse parameters with defaults
  const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];
  const startDate = searchParams.get("startDate") || (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  })();
  const groupBy = searchParams.get("groupBy") || "day";

  // Validate groupBy parameter
  if (!["day", "week", "month", "year"].includes(groupBy)) {
    return NextResponse.json(
      { error: "Invalid groupBy parameter. Must be: day, week, month, year" },
      { status: 400 }
    );
  }

  // Call the RPC function
  const { data, error } = await supabase.rpc("get_admin_income_stats", {
    p_start_date: `${startDate}T00:00:00Z`,
    p_end_date: `${endDate}T23:59:59Z`,
    p_group_by: groupBy,
  });

  if (error) {
    console.error("Error fetching income stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch income stats" },
      { status: 500 }
    );
  }

  // Calculate totals
  const totals = (data || []).reduce(
    (acc: {
      personal_purchases: number;
      org_purchases: number;
      subscription_revenue: number;
      total_revenue: number;
      usage_revenue: number;
      cost_anthropic: number;
      cost_openai: number;
      cost_google: number;
      cost_mistral: number;
      total_cost: number;
      net_margin: number;
    }, row: {
      personal_purchases: number;
      org_purchases: number;
      subscription_revenue: number;
      total_revenue: number;
      usage_revenue: number;
      cost_anthropic: number;
      cost_openai: number;
      cost_google: number;
      cost_mistral: number;
      total_cost: number;
      net_margin: number;
    }) => {
      acc.personal_purchases += Number(row.personal_purchases) || 0;
      acc.org_purchases += Number(row.org_purchases) || 0;
      acc.subscription_revenue += Number(row.subscription_revenue) || 0;
      acc.total_revenue += Number(row.total_revenue) || 0;
      acc.usage_revenue += Number(row.usage_revenue) || 0;
      acc.cost_anthropic += Number(row.cost_anthropic) || 0;
      acc.cost_openai += Number(row.cost_openai) || 0;
      acc.cost_google += Number(row.cost_google) || 0;
      acc.cost_mistral += Number(row.cost_mistral) || 0;
      acc.total_cost += Number(row.total_cost) || 0;
      acc.net_margin += Number(row.net_margin) || 0;
      return acc;
    },
    {
      personal_purchases: 0,
      org_purchases: 0,
      subscription_revenue: 0,
      total_revenue: 0,
      usage_revenue: 0,
      cost_anthropic: 0,
      cost_openai: 0,
      cost_google: 0,
      cost_mistral: 0,
      total_cost: 0,
      net_margin: 0,
    }
  );

  // Calculate overall margin percentage (based on usage revenue)
  const margin_percent = totals.usage_revenue > 0
    ? ((totals.net_margin / totals.usage_revenue) * 100)
    : 0;

  return NextResponse.json({
    periods: data || [],
    totals: {
      ...totals,
      margin_percent: Math.round(margin_percent * 100) / 100,
    },
    params: {
      startDate,
      endDate,
      groupBy,
    },
  });
}
