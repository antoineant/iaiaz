"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// BulkAllocateModal removed - credits now draw directly from org pool
import {
  Users,
  CreditCard,
  TrendingUp,
  UserPlus,
  Loader2,
  Wallet,
  AlertTriangle,
} from "lucide-react";

interface OrgStats {
  organization_name: string;
  credit_balance: number;
  total_used: number;
  total_members: number;
  students_count: number;
  teachers_count: number;
  admins_count: number;
  usage_this_month: number;
  pending_invites: number;
  seat_count: number | null;
  is_over_seat_limit: boolean;
}

interface RecentActivity {
  id: string;
  type: "usage" | "allocation" | "invite";
  amount?: number;
  description: string;
  created_at: string;
  member_email?: string;
}

export default function OrgDashboardPage() {
  const t = useTranslations("org.dashboard");
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get user's organization
      const { data: orgMember } = await supabase.rpc("get_user_organization", {
        p_user_id: user.id,
      });

      if (!orgMember || orgMember.length === 0) return;

      const orgId = orgMember[0].organization_id;

      // Get organization details (including seat_count for soft limit warning)
      const { data: org } = await supabase
        .from("organizations")
        .select("name, credit_balance, seat_count")
        .eq("id", orgId)
        .single();

      // Get member counts by role
      const { data: members } = await supabase
        .from("organization_members")
        .select("role, credit_allocated, credit_used")
        .eq("organization_id", orgId)
        .eq("status", "active");

      // Count by role and sum usage
      const roleCounts = {
        student: 0,
        teacher: 0,
        admin: 0,
        owner: 0,
      };
      let totalUsed = 0;

      members?.forEach((m) => {
        roleCounts[m.role as keyof typeof roleCounts]++;
        totalUsed += m.credit_used || 0;
      });

      // Get usage this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: usageData } = await supabase
        .from("organization_transactions")
        .select("amount")
        .eq("organization_id", orgId)
        .eq("type", "usage")
        .gte("created_at", monthStart.toISOString());

      const usageThisMonth =
        usageData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      // Get pending invites count
      const { count: pendingInvites } = await supabase
        .from("organization_invites")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString());

      const totalMembers = members?.length || 0;
      const seatCount = org?.seat_count ?? null;
      const isOverSeatLimit = seatCount !== null && totalMembers > seatCount;

      setStats({
        organization_name: org?.name || "",
        credit_balance: org?.credit_balance || 0,
        total_used: totalUsed,
        total_members: totalMembers,
        students_count: roleCounts.student,
        teachers_count: roleCounts.teacher,
        admins_count: roleCounts.admin + roleCounts.owner,
        usage_this_month: usageThisMonth,
        pending_invites: pendingInvites || 0,
        seat_count: seatCount,
        is_over_seat_limit: isOverSeatLimit,
      });

      // Get recent activity
      const { data: transactions } = await supabase
        .from("organization_transactions")
        .select(
          `
          id,
          type,
          amount,
          description,
          created_at,
          organization_members(profiles(email))
        `
        )
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (transactions) {
        setRecentActivity(
          transactions.map((t) => ({
            id: t.id,
            type: t.type as "usage" | "allocation" | "invite",
            amount: t.amount,
            description: t.description || "",
            created_at: t.created_at,
            member_email: (t.organization_members as { profiles?: { email?: string } })
              ?.profiles?.email,
          }))
        );
      }

      setIsLoading(false);
    };

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Credits are now drawn directly from the pool - no allocation needed
  const creditBalance = stats?.credit_balance || 0;
  const totalUsed = stats?.total_used || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

      {/* Seat Limit Warning */}
      {stats?.is_over_seat_limit && (
        <Card className="mb-6 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {t("seatLimitWarning.title")}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {t("seatLimitWarning.description", {
                    current: stats.total_members,
                    limit: stats.seat_count ?? 0,
                  })}
                </p>
                <Link
                  href="/org/subscription"
                  className="inline-flex items-center text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline mt-2"
                >
                  {t("seatLimitWarning.upgradeLink")} →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Card */}
      <Card className="mb-6 border-primary-200 dark:border-primary-800 bg-gradient-to-r from-primary-50 to-white dark:from-primary-950 dark:to-[var(--background)]">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-primary-600" />
                <h2 className="font-semibold">{t("quickActions")}</h2>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>
                  <span className="text-[var(--muted-foreground)]">
                    {t("creditPool")}:
                  </span>{" "}
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {creditBalance.toFixed(2)}€
                  </span>
                </span>
                <span>
                  <span className="text-[var(--muted-foreground)]">
                    {t("totalUsed")}:
                  </span>{" "}
                  <span className="font-medium text-primary-600 dark:text-primary-400">
                    {totalUsed.toFixed(2)}€
                  </span>
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                {t("creditExplanationSimple")}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/org/credits"
                className="inline-flex items-center justify-center px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--muted)] transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {t("buyCredits")}
              </Link>
              <Link
                href="/org/classes"
                className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                {t("manageClasses")}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Credit Pool */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("creditPool")}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {creditBalance.toFixed(2)}€
                </p>
                <p className="text-xs mt-1 text-[var(--muted-foreground)]">
                  {t("totalUsed")}: {totalUsed.toFixed(2)}€
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("members")}
                </p>
                <p className="text-2xl font-bold mt-1">{stats?.total_members}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {stats?.students_count} {t("students")}, {stats?.teachers_count}{" "}
                  {t("teachers")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage this month */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("usageThisMonth")}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stats?.usage_this_month.toFixed(2)}€
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("pendingInvites")}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stats?.pending_invites}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t("creditUsage")}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    {t("totalUsed")}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      ({t("studentCount", { count: stats?.students_count || 0 })})
                    </span>
                  </span>
                  <span className="font-medium">{totalUsed.toFixed(2)}€</span>
                </div>
                <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (totalUsed / (creditBalance + totalUsed || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t("remaining")}</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {creditBalance.toFixed(2)}€
                  </span>
                </div>
                <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (creditBalance / (creditBalance + totalUsed || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t("recentActivity")}</h2>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-[var(--muted-foreground)] text-sm">
                {t("noActivity")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                  >
                    <div>
                      <p className="text-sm">
                        {activity.member_email || t("unknownMember")}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        activity.type === "usage"
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {activity.type === "usage" ? "-" : "+"}
                      {Math.abs(activity.amount || 0).toFixed(3)}€
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
