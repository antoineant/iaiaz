import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatCO2 } from "@/lib/utils";
import {
  CreditCard,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Wallet,
  Settings,
  BarChart3,
  Leaf,
  Receipt,
} from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dashboard");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Check if user has accepted terms
  const { data: termsCheck } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("id", user.id)
    .single();

  if (!termsCheck?.terms_accepted_at) {
    redirect(`/${locale}/auth/accept-terms`);
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch stats
  const { count: conversationCount } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: usageData } = await supabase
    .from("api_usage")
    .select("cost_eur, co2_grams")
    .eq("user_id", user.id);

  const totalSpent = usageData?.reduce((acc, u) => acc + u.cost_eur, 0) || 0;
  const totalCO2 = usageData?.reduce((acc, u) => acc + (u.co2_grams || 0), 0) || 0;

  // Fetch recent transactions
  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Date formatting based on locale
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            iaiaz
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/chat"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {t("nav.chat")}
            </Link>
            <Link href="/dashboard/credits">
              <Button size="sm">
                <CreditCard className="w-4 h-4 mr-2" />
                {t("nav.recharge")}
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("stats.currentBalance")}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(profile?.credits_balance || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("stats.conversations")}
                  </p>
                  <p className="text-2xl font-bold">{conversationCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("stats.totalSpent")}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalSpent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("stats.carbonFootprint")}
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCO2(totalCO2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">{t("quickActions.title")}</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/chat">
                <Button variant="outline" className="w-full justify-between">
                  {t("quickActions.newConversation")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard/credits">
                <Button variant="outline" className="w-full justify-between">
                  {t("quickActions.buyCredits")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard/purchases">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    {t("quickActions.purchases")}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {t("quickActions.analytics")}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t("quickActions.settings")}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">{t("accountInfo.title")}</h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">{t("accountInfo.email")}</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">
                    {t("accountInfo.memberSince")}
                  </dt>
                  <dd className="font-medium">
                    {new Date(profile?.created_at || "").toLocaleDateString(
                      dateLocale,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t("transactions.title")}</h2>
          </CardHeader>
          <CardContent>
            {!transactions || transactions.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                {t("transactions.empty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 font-medium">{t("transactions.date")}</th>
                      <th className="text-left py-2 font-medium">{t("transactions.type")}</th>
                      <th className="text-left py-2 font-medium">{t("transactions.description")}</th>
                      <th className="text-right py-2 font-medium">{t("transactions.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="py-3 text-[var(--muted-foreground)]">
                          {new Date(tx.created_at).toLocaleDateString(dateLocale)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              tx.type === "purchase"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : tx.type === "usage"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                  : tx.type === "bonus"
                                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {tx.type === "purchase"
                              ? t("transactions.types.purchase")
                              : tx.type === "usage"
                                ? t("transactions.types.usage")
                                : tx.type === "bonus"
                                  ? t("transactions.types.bonus")
                                  : tx.type}
                          </span>
                        </td>
                        <td className="py-3 text-[var(--muted-foreground)] truncate max-w-xs">
                          {tx.description || "-"}
                        </td>
                        <td
                          className={`py-3 text-right font-medium ${
                            tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
