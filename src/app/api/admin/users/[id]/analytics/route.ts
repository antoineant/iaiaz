import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Fetch profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email, display_name, avatar_url, account_type, is_admin, credits_balance, created_at, updated_at")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch auth metadata
    let authMeta: { email_confirmed_at: string | null; last_sign_in_at: string | null } = {
      email_confirmed_at: null,
      last_sign_in_at: null,
    };
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(id);
      if (authUser?.user) {
        authMeta = {
          email_confirmed_at: authUser.user.email_confirmed_at || null,
          last_sign_in_at: authUser.user.last_sign_in_at || null,
        };
      }
    } catch {
      // Auth metadata is non-critical
    }

    // Fetch period usage data
    const { data: usageData } = await adminClient
      .from("api_usage")
      .select("*")
      .eq("user_id", id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Aggregate period data
    const totals = { cost: 0, co2: 0, tokensInput: 0, tokensOutput: 0, messages: usageData?.length || 0 };
    const modelBreakdown: Record<string, { messages: number; cost: number; co2: number; tokensInput: number; tokensOutput: number }> = {};
    const providerBreakdown: Record<string, { messages: number; cost: number; co2: number }> = {};
    const dailyData: Record<string, { date: string; cost: number; co2: number; messages: number }> = {};

    usageData?.forEach((usage) => {
      const cost = usage.cost_eur || 0;
      const co2 = usage.co2_grams || 0;
      const tokensIn = usage.tokens_input || 0;
      const tokensOut = usage.tokens_output || 0;

      totals.cost += cost;
      totals.co2 += co2;
      totals.tokensInput += tokensIn;
      totals.tokensOutput += tokensOut;

      const model = usage.model;
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { messages: 0, cost: 0, co2: 0, tokensInput: 0, tokensOutput: 0 };
      }
      modelBreakdown[model].messages++;
      modelBreakdown[model].cost += cost;
      modelBreakdown[model].co2 += co2;
      modelBreakdown[model].tokensInput += tokensIn;
      modelBreakdown[model].tokensOutput += tokensOut;

      const provider = usage.provider;
      if (!providerBreakdown[provider]) {
        providerBreakdown[provider] = { messages: 0, cost: 0, co2: 0 };
      }
      providerBreakdown[provider].messages++;
      providerBreakdown[provider].cost += cost;
      providerBreakdown[provider].co2 += co2;

      const dateKey = new Date(usage.created_at).toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, cost: 0, co2: 0, messages: 0 };
      }
      dailyData[dateKey].cost += cost;
      dailyData[dateKey].co2 += co2;
      dailyData[dateKey].messages++;
    });

    // All-time totals
    const { data: allTimeData } = await adminClient
      .from("api_usage")
      .select("cost_eur, co2_grams, tokens_input, tokens_output")
      .eq("user_id", id);

    const allTimeTotals = {
      cost: allTimeData?.reduce((acc, u) => acc + (u.cost_eur || 0), 0) || 0,
      co2: allTimeData?.reduce((acc, u) => acc + (u.co2_grams || 0), 0) || 0,
      tokensInput: allTimeData?.reduce((acc, u) => acc + (u.tokens_input || 0), 0) || 0,
      tokensOutput: allTimeData?.reduce((acc, u) => acc + (u.tokens_output || 0), 0) || 0,
      messages: allTimeData?.length || 0,
    };

    // Credit summary
    const { data: creditData } = await adminClient
      .from("credit_transactions")
      .select("amount, type")
      .eq("user_id", id);

    let totalPurchased = 0;
    let totalUsed = 0;
    creditData?.forEach((tx) => {
      if (tx.amount > 0) {
        totalPurchased += tx.amount;
      } else {
        totalUsed += Math.abs(tx.amount);
      }
    });

    // Recent 20 credit transactions
    const { data: recentTransactions } = await adminClient
      .from("credit_transactions")
      .select("id, amount, type, description, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Recent 20 conversations with message counts
    const { data: recentConversations } = await adminClient
      .from("conversations")
      .select("id, title, model, created_at, updated_at")
      .eq("user_id", id)
      .order("updated_at", { ascending: false })
      .limit(20);

    // Get message counts for conversations
    const conversationsWithCounts = [];
    if (recentConversations) {
      for (const conv of recentConversations) {
        const { count } = await adminClient
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id);
        conversationsWithCounts.push({ ...conv, message_count: count || 0 });
      }
    }

    // Organization membership
    const { data: orgMemberships } = await adminClient
      .from("organization_members")
      .select("role, credits_allocated, credits_used, organization_id")
      .eq("user_id", id);

    let organizations: Array<{
      id: string;
      name: string;
      role: string;
      credits_allocated: number;
      credits_used: number;
    }> = [];

    if (orgMemberships && orgMemberships.length > 0) {
      const orgIds = orgMemberships.map((m) => m.organization_id);
      const { data: orgs } = await adminClient
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);

      organizations = orgMemberships.map((m) => {
        const org = orgs?.find((o) => o.id === m.organization_id);
        return {
          id: m.organization_id,
          name: org?.name || "Unknown",
          role: m.role,
          credits_allocated: m.credits_allocated || 0,
          credits_used: m.credits_used || 0,
        };
      });
    }

    return NextResponse.json({
      profile: {
        ...profile,
        email_confirmed_at: authMeta.email_confirmed_at,
        last_sign_in_at: authMeta.last_sign_in_at,
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      totals,
      allTimeTotals,
      creditSummary: {
        balance: profile.credits_balance,
        totalPurchased,
        totalUsed,
      },
      dailyData: Object.values(dailyData).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
      modelBreakdown: Object.entries(modelBreakdown)
        .map(([model, data]) => ({ model, ...data }))
        .sort((a, b) => b.cost - a.cost),
      providerBreakdown: Object.entries(providerBreakdown)
        .map(([provider, data]) => ({ provider, ...data }))
        .sort((a, b) => b.cost - a.cost),
      recentTransactions: recentTransactions || [],
      recentConversations: conversationsWithCounts,
      organizations,
    });
  } catch (error) {
    console.error("Admin user analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user analytics" },
      { status: 500 }
    );
  }
}
