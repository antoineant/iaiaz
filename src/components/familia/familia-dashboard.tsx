"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Settings,
  CreditCard,
  BarChart3,
  Moon,
  Sparkles,
  MessageSquare,
  LogOut,
  ArrowLeftRight
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { getThemeColor } from "@/lib/familia/theme";
import { CreditTransferModal } from "./credit-transfer-modal";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  display_name: string | null;
  birthdate: string | null;
  accent_color: string | null;
  credits_balance: number | string | null;
}

interface Member {
  user_id: string;
  role: string;
  supervision_mode: string | null;
  profiles: Profile | null;
}

interface Conversation {
  id: string;
  user_id: string;
  created_at: string;
  title: string | null;
  topic_category: string | null;
  cost: number | null;
  message_count: number | null;
  assistant_id: string | null;
  custom_assistants: { name: string; avatar: string } | null;
}

interface Flag {
  id: string;
  conversation_id: string;
  flag_type: string;
  severity: string;
  metadata: any;
  created_at: string;
}

interface FamiliaDashboardProps {
  locale: string;
  showWelcome?: boolean;
  organizationId: string;
  organizationName: string;
  subscriptionStatus: string;
  subscriptionTrialEnd: string | null;
  creditBalance: number;
  weeklySpent: number;
  weeklyConversations: number;
  activeAlerts: number;
  members: Member[];
  conversations: Conversation[];
  flags: Flag[];
  memberCosts: Record<string, number>;
}

export function FamiliaDashboard({
  locale,
  showWelcome,
  organizationId,
  organizationName,
  subscriptionStatus,
  subscriptionTrialEnd,
  creditBalance,
  weeklySpent,
  weeklyConversations,
  activeAlerts,
  members,
  conversations,
  flags,
  memberCosts,
}: FamiliaDashboardProps) {
  const t = useTranslations("familia.dashboard");
  const router = useRouter();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(showWelcome);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const childCount = members.filter((m) => m.role !== "owner" && m.role !== "admin").length;

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const res = await fetch("/api/stripe/checkout/familia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childCount: Math.max(childCount, 1), organizationId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setIsSubscribing(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/${locale}/auth/login`;
  };

  // Separate children from parents
  const children = members.filter((m) => m.role !== "owner" && m.role !== "admin");
  const parents = members.filter((m) => m.role === "owner" || m.role === "admin");

  // Compute insights per child
  const getMemberInsights = (userId: string) => {
    const memberConvos = conversations.filter((c) => c.user_id === userId);
    const memberFlags = flags.filter((f) => 
      memberConvos.some((c) => c.id === f.conversation_id)
    );

    const difficultyFlags = memberFlags.filter((f) => f.flag_type === "difficulty");
    const lateUsageFlags = memberFlags.filter((f) => f.flag_type === "late_usage");

    // Topic frequency
    const topics: Record<string, number> = {};
    memberConvos.forEach((c) => {
      if (c.topic_category) {
        topics[c.topic_category] = (topics[c.topic_category] || 0) + 1;
      }
    });
    const topTopics = Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    const spent = memberCosts[userId] || 0;

    return {
      conversationCount: memberConvos.length,
      spent,
      topTopics,
      difficultyCount: difficultyFlags.length,
      lateUsageCount: lateUsageFlags.length,
      latestConvo: memberConvos[0],
    };
  };

  // Compute global smart insights
  const getSmartInsights = () => {
    const insights: Array<{ type: string; message: string; severity: "info" | "warning" | "success" }> = [];

    children.forEach((child) => {
      const profile = child.profiles;
      const firstName = profile?.display_name || "Member";
      const insights_data = getMemberInsights(child.user_id);

      // Difficulty pattern
      if (insights_data.difficultyCount >= 3) {
        insights.push({
          type: "difficulty",
          message: t("insights.difficulty", { name: firstName, count: insights_data.difficultyCount }),
          severity: "warning",
        });
      }

      // Late usage
      if (insights_data.lateUsageCount > 0) {
        insights.push({
          type: "late_usage",
          message: t("insights.lateUsage", { name: firstName }),
          severity: "warning",
        });
      }

      // New topic interest
      if (insights_data.topTopics.length > 0 && insights_data.conversationCount >= 5) {
        insights.push({
          type: "topic_trend",
          message: t("insights.topicTrend", { name: firstName, topic: insights_data.topTopics[0] }),
          severity: "info",
        });
      }
    });

    // Budget tracking
    const avgDailySpend = weeklySpent / 7;
    if (avgDailySpend < 1.0) {
      insights.push({
        type: "budget",
        message: t("insights.budgetOnTrack", { daily: avgDailySpend.toFixed(2) }),
        severity: "success",
      });
    }

    return insights.slice(0, 4); // Max 4 insights
  };

  const smartInsights = getSmartInsights();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{organizationName}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Action buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <Link href={{ pathname: "/chat", query: { skipRedirect: "true" } } as never}>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t("header.chat")}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransferModal(true)}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                {t("header.transfer")}
              </Button>
            </div>

            {/* Credit balance ring */}
            <div className="relative flex items-center gap-3">
              <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  fill="none"
                  strokeWidth="2.5"
                  style={{
                    stroke: "#10b981",
                    strokeDasharray: `${Math.min(138, creditBalance * 5)} 138`,
                    strokeLinecap: "round",
                    filter: "drop-shadow(0 0 4px #10b98150)",
                  }}
                />
              </svg>
              <div>
                <p className="text-2xl font-bold text-green-600">{creditBalance.toFixed(2)}€</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t("creditBalance")}</p>
              </div>
            </div>

            {/* Logout button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">{t("header.logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscription Status Banner */}
        {subscriptionStatus === "none" && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">{t("subscription.paymentPending")}</p>
            </div>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSubscribe} disabled={isSubscribing}>
              {t("subscription.subscribe")}
            </Button>
          </div>
        )}

        {subscriptionStatus === "trialing" && subscriptionTrialEnd && new Date(subscriptionTrialEnd) > new Date() && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t("subscription.trialActive", {
                  date: new Date(subscriptionTrialEnd).toLocaleDateString(locale, { day: "numeric", month: "long" }),
                })}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleSubscribe} disabled={isSubscribing}>
              {t("subscription.subscribe")}
            </Button>
          </div>
        )}

        {subscriptionStatus === "trialing" && subscriptionTrialEnd && new Date(subscriptionTrialEnd) <= new Date() && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">{t("subscription.trialExpired")}</p>
            </div>
            <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white" onClick={handleSubscribe} disabled={isSubscribing}>
              {t("subscription.subscribe")}
            </Button>
          </div>
        )}

        {subscriptionStatus === "past_due" && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{t("subscription.pastDue")}</p>
          </div>
        )}

        {/* Quick Stats */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            {t("quickStats.title")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-primary-600">{weeklySpent.toFixed(2)}€</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">{t("quickStats.spent")}</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-primary-300" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-accent-600">{weeklyConversations}</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">{t("quickStats.conversations")}</p>
                  </div>
                  <Sparkles className="w-8 h-8 text-accent-300" />
                </div>
              </CardContent>
            </Card>
            <Card className={activeAlerts > 0 ? "border-amber-200 dark:border-amber-800" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-amber-600">{activeAlerts}</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">{t("quickStats.alerts")}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-amber-300" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Family Members */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t("members.title")}</h2>
          {children.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-[var(--muted-foreground)]">
                {t("members.noChildren")}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {children.map((member) => {
              const profile = member.profiles;
              const firstName = profile?.display_name || "Member";
              const insights = getMemberInsights(member.user_id);
              const accentColor = getThemeColor(profile?.accent_color || "blue");
              const colorHex = accentColor?.hex || "#818CF8";

              // Usage bar: proportion of weekly spend relative to credit balance
              const maxBar = Math.max(creditBalance, 1);
              const barPercent = Math.min((insights.spent / maxBar) * 100, 100);

              return (
                <Card
                  key={member.user_id}
                  className="overflow-hidden hover:border-[var(--foreground)]/20 transition-colors cursor-pointer"
                  onClick={() => router.push({ pathname: "/familia/dashboard/[childId]", params: { childId: member.user_id } })}
                >
                    <CardContent className="p-4">
                      {/* Row 1: Avatar + Name + Mode badge + Stats */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ backgroundColor: colorHex }}
                          >
                            {firstName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{firstName}</h3>
                            {member.supervision_mode && member.supervision_mode !== "adult" && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  member.supervision_mode === "guided"
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                }`}
                              >
                                {t(`members.modes.${member.supervision_mode}`)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm text-[var(--muted-foreground)]">
                          <span className="font-semibold text-[var(--foreground)]">{insights.spent.toFixed(2)}€</span>
                          {insights.conversationCount > 0 && (
                            <span> · {insights.conversationCount} conv.</span>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Usage bar */}
                      <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(barPercent, 2)}%`,
                            backgroundColor: colorHex,
                          }}
                        />
                      </div>

                      {/* Row 3: Topics + Alerts (compact) */}
                      {(insights.topTopics.length > 0 || insights.difficultyCount >= 2 || insights.lateUsageCount > 0) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {insights.topTopics.length > 0 && (
                            <>
                              <span className="text-xs text-[var(--muted-foreground)]">{t("members.thisWeek")} :</span>
                              {insights.topTopics.map((topic) => (
                                <span
                                  key={topic}
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{ color: colorHex, backgroundColor: `${colorHex}15` }}
                                >
                                  {topic}
                                </span>
                              ))}
                            </>
                          )}
                          {insights.difficultyCount >= 2 && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {t("members.difficultyDetected", { count: insights.difficultyCount })}
                            </span>
                          )}
                          {insights.lateUsageCount > 0 && (
                            <span className="text-xs text-purple-600 flex items-center gap-1">
                              <Moon className="w-3 h-3" />
                              {t("members.lateUsage")}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                </Card>
              );
            })}
            </div>
          )}
        </section>

        {/* Smart Insights */}
        {smartInsights.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-600" />
              {t("smartInsights.title")}
            </h2>
            <div className="space-y-3">
              {smartInsights.map((insight, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    insight.severity === "warning"
                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                      : insight.severity === "success"
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                  }`}
                >
                  {insight.severity === "warning" && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                  {insight.severity === "success" && <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                  {insight.severity === "info" && <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                  <p className="text-sm">{insight.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold mb-4">{t("quickActions.title")}</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/familia/settings">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                {t("quickActions.manageControls")}
              </Button>
            </Link>
            <Link href="/dashboard/credits">
              <Button variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                {t("quickActions.addCredits")}
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                {t("quickActions.viewAllActivity")}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Credit Transfer Modal */}
      <CreditTransferModal
        open={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        organizationBalance={creditBalance}
        members={children}
      />

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--background)] rounded-2xl max-w-md w-full p-8 shadow-xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">{t("welcome.title")}</h2>
              <p className="text-[var(--muted-foreground)]">{t("welcome.subtitle")}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold">{t("welcome.step1Title")}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("welcome.step1Text")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-accent-600 font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="font-semibold">{t("welcome.step2Title")}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("welcome.step2Text")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="font-semibold">{t("welcome.step3Title")}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("welcome.step3Text", { creditBalance: creditBalance.toFixed(0) })}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-green-700 dark:text-green-300">
                <span className="font-semibold">{t("welcome.creditNote", { amount: creditBalance.toFixed(0) })}</span>{" "}
                {t("welcome.creditText")}
              </p>
            </div>

            <Link href="/familia/settings">
              <Button
                onClick={() => setShowWelcomeModal(false)}
                className="w-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white"
              >
                {t("welcome.getStarted")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
