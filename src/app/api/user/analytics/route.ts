import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get time range from query params (default: last 30 days)
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Fetch all usage data for the user in the time range
    const { data: usageData, error: usageError } = await adminClient
      .from("api_usage")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (usageError) throw usageError;

    // Calculate totals
    const totals = {
      cost: 0,
      co2: 0,
      tokensInput: 0,
      tokensOutput: 0,
      messages: usageData?.length || 0,
    };

    const modelBreakdown: Record<string, {
      messages: number;
      cost: number;
      co2: number;
      tokensInput: number;
      tokensOutput: number;
    }> = {};

    const providerBreakdown: Record<string, {
      messages: number;
      cost: number;
      co2: number;
    }> = {};

    const dailyData: Record<string, {
      date: string;
      cost: number;
      co2: number;
      messages: number;
    }> = {};

    usageData?.forEach((usage) => {
      const cost = usage.cost_eur || 0;
      const co2 = usage.co2_grams || 0;
      const tokensIn = usage.tokens_input || 0;
      const tokensOut = usage.tokens_output || 0;

      // Totals
      totals.cost += cost;
      totals.co2 += co2;
      totals.tokensInput += tokensIn;
      totals.tokensOutput += tokensOut;

      // Model breakdown
      const model = usage.model;
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { messages: 0, cost: 0, co2: 0, tokensInput: 0, tokensOutput: 0 };
      }
      modelBreakdown[model].messages++;
      modelBreakdown[model].cost += cost;
      modelBreakdown[model].co2 += co2;
      modelBreakdown[model].tokensInput += tokensIn;
      modelBreakdown[model].tokensOutput += tokensOut;

      // Provider breakdown
      const provider = usage.provider;
      if (!providerBreakdown[provider]) {
        providerBreakdown[provider] = { messages: 0, cost: 0, co2: 0 };
      }
      providerBreakdown[provider].messages++;
      providerBreakdown[provider].cost += cost;
      providerBreakdown[provider].co2 += co2;

      // Daily data
      const dateKey = new Date(usage.created_at).toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, cost: 0, co2: 0, messages: 0 };
      }
      dailyData[dateKey].cost += cost;
      dailyData[dateKey].co2 += co2;
      dailyData[dateKey].messages++;
    });

    // Convert daily data to sorted array
    const dailyArray = Object.values(dailyData).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Convert model breakdown to sorted array (by cost)
    const modelArray = Object.entries(modelBreakdown)
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.cost - a.cost);

    // Convert provider breakdown to sorted array
    const providerArray = Object.entries(providerBreakdown)
      .map(([provider, data]) => ({ provider, ...data }))
      .sort((a, b) => b.cost - a.cost);

    // Get all-time totals
    const { data: allTimeData } = await adminClient
      .from("api_usage")
      .select("cost_eur, co2_grams, tokens_input, tokens_output")
      .eq("user_id", user.id);

    const allTimeTotals = {
      cost: allTimeData?.reduce((acc, u) => acc + (u.cost_eur || 0), 0) || 0,
      co2: allTimeData?.reduce((acc, u) => acc + (u.co2_grams || 0), 0) || 0,
      tokensInput: allTimeData?.reduce((acc, u) => acc + (u.tokens_input || 0), 0) || 0,
      tokensOutput: allTimeData?.reduce((acc, u) => acc + (u.tokens_output || 0), 0) || 0,
      messages: allTimeData?.length || 0,
    };

    // Get conversation count
    const { count: conversationCount } = await adminClient
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      totals,
      allTimeTotals,
      conversationCount: conversationCount || 0,
      dailyData: dailyArray,
      modelBreakdown: modelArray,
      providerBreakdown: providerArray,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
