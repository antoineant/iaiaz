"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatCO2 } from "@/lib/utils";
import {
  ArrowLeft,
  Leaf,
  Wallet,
  Zap,
  MessageSquare,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AnalyticsData {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  totals: {
    cost: number;
    co2: number;
    tokensInput: number;
    tokensOutput: number;
    messages: number;
  };
  allTimeTotals: {
    cost: number;
    co2: number;
    tokensInput: number;
    tokensOutput: number;
    messages: number;
  };
  conversationCount: number;
  dailyData: Array<{
    date: string;
    cost: number;
    co2: number;
    messages: number;
  }>;
  modelBreakdown: Array<{
    model: string;
    messages: number;
    cost: number;
    co2: number;
    tokensInput: number;
    tokensOutput: number;
  }>;
  providerBreakdown: Array<{
    provider: string;
    messages: number;
    cost: number;
    co2: number;
  }>;
}

interface AnalyticsDashboardProps {
  locale: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  iconColor,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center`}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subValue && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {subValue}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleBarChart({
  data,
  dataKey,
  label,
  formatValue,
  color,
}: {
  data: Array<{ date: string; [key: string]: number | string }>;
  dataKey: string;
  label: string;
  formatValue: (v: number) => string;
  color: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-[var(--muted-foreground)]">
        Pas de données pour cette période
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Number(d[dataKey]) || 0));
  const safeMax = maxValue || 1;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
      <div className="flex items-end gap-1 h-32">
        {data.slice(-14).map((item, index) => {
          const value = Number(item[dataKey]) || 0;
          const height = (value / safeMax) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full ${color} rounded-t transition-all`}
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${new Date(item.date).toLocaleDateString()}: ${formatValue(value)}`}
              />
              {index % 2 === 0 && (
                <span className="text-[10px] text-[var(--muted-foreground)] transform -rotate-45 origin-top-left whitespace-nowrap">
                  {new Date(item.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CO2MethodologyCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations("dashboard.analytics.methodology");

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-[var(--muted-foreground)]" />
            <h2 className="font-semibold">{t("title")}</h2>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--muted-foreground)]" />
          )}
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4 text-sm">
          <p className="text-[var(--muted-foreground)]">{t("intro")}</p>

          <div className="space-y-3">
            <h3 className="font-medium">{t("tiers.title")}</h3>
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-2 rounded bg-[var(--muted)]">
                <div>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {t("tiers.economy.name")}
                  </span>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t("tiers.economy.models")}
                  </p>
                </div>
                <span className="text-sm font-mono">~0.03g CO₂/1k tokens</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[var(--muted)]">
                <div>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {t("tiers.standard.name")}
                  </span>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t("tiers.standard.models")}
                  </p>
                </div>
                <span className="text-sm font-mono">~0.15g CO₂/1k tokens</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[var(--muted)]">
                <div>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {t("tiers.premium.name")}
                  </span>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t("tiers.premium.models")}
                  </p>
                </div>
                <span className="text-sm font-mono">~0.50g CO₂/1k tokens</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">{t("factors.title")}</h3>
            <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
              <li>{t("factors.pue")}</li>
              <li>{t("factors.gpu")}</li>
              <li>{t("factors.grid")}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">{t("sources.title")}</h3>
            <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)] text-xs">
              <li>IEA Data Center Energy Estimates (2023)</li>
              <li>Strubell et al. &quot;Energy and Policy Considerations for Deep Learning in NLP&quot; (2019)</li>
              <li>Patterson et al. &quot;Carbon Emissions and Large Neural Network Training&quot; (2021)</li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-amber-800 dark:text-amber-200 text-xs">
              <strong>{t("disclaimer.title")}:</strong> {t("disclaimer.text")}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function AnalyticsDashboard({ locale }: AnalyticsDashboardProps) {
  const t = useTranslations("dashboard.analytics");
  const tNav = useTranslations("dashboard.nav");

  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(`/api/user/analytics?days=${days}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [days]);

  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">{t("title")}</h1>
          </div>
          <nav className="flex items-center gap-2">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? "primary" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d} {t("days")}
              </Button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Period Stats */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                {t("periodStats", { days })}
              </h2>
              <div className="grid md:grid-cols-4 gap-4">
                <StatCard
                  icon={Wallet}
                  label={t("stats.cost")}
                  value={formatCurrency(data.totals.cost)}
                  iconColor="text-primary-600 dark:text-primary-400"
                  iconBg="bg-primary-100 dark:bg-primary-900/30"
                />
                <StatCard
                  icon={Leaf}
                  label={t("stats.co2")}
                  value={formatCO2(data.totals.co2)}
                  iconColor="text-green-600 dark:text-green-400"
                  iconBg="bg-green-100 dark:bg-green-900/30"
                />
                <StatCard
                  icon={MessageSquare}
                  label={t("stats.messages")}
                  value={data.totals.messages.toLocaleString()}
                  iconColor="text-accent-600 dark:text-accent-400"
                  iconBg="bg-accent-100 dark:bg-accent-900/30"
                />
                <StatCard
                  icon={Zap}
                  label={t("stats.tokens")}
                  value={(data.totals.tokensInput + data.totals.tokensOutput).toLocaleString()}
                  subValue={`${data.totals.tokensInput.toLocaleString()} in / ${data.totals.tokensOutput.toLocaleString()} out`}
                  iconColor="text-yellow-600 dark:text-yellow-400"
                  iconBg="bg-yellow-100 dark:bg-yellow-900/30"
                />
              </div>
            </div>

            {/* All Time Stats */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold">{t("allTimeStats")}</h2>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(data.allTimeTotals.cost)}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("stats.totalCost")}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCO2(data.allTimeTotals.co2)}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("stats.totalCO2")}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {data.allTimeTotals.messages.toLocaleString()}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("stats.totalMessages")}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {data.conversationCount.toLocaleString()}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("stats.conversations")}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {(
                        (data.allTimeTotals.tokensInput +
                          data.allTimeTotals.tokensOutput) /
                        1000
                      ).toFixed(1)}k
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("stats.totalTokens")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h2 className="font-semibold">{t("charts.costOverTime")}</h2>
                </CardHeader>
                <CardContent>
                  <SimpleBarChart
                    data={data.dailyData}
                    dataKey="cost"
                    label=""
                    formatValue={(v) => formatCurrency(v)}
                    color="bg-primary-500"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-600 dark:text-green-400" />
                    {t("charts.co2OverTime")}
                  </h2>
                </CardHeader>
                <CardContent>
                  <SimpleBarChart
                    data={data.dailyData}
                    dataKey="co2"
                    label=""
                    formatValue={(v) => formatCO2(v)}
                    color="bg-green-500"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Model Breakdown */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold">{t("modelBreakdown.title")}</h2>
              </CardHeader>
              <CardContent>
                {data.modelBreakdown.length === 0 ? (
                  <p className="text-[var(--muted-foreground)] text-center py-8">
                    {t("modelBreakdown.empty")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="text-left py-2 font-medium">
                            {t("modelBreakdown.model")}
                          </th>
                          <th className="text-right py-2 font-medium">
                            {t("modelBreakdown.messages")}
                          </th>
                          <th className="text-right py-2 font-medium">
                            {t("modelBreakdown.cost")}
                          </th>
                          <th className="text-right py-2 font-medium">
                            <span className="flex items-center justify-end gap-1">
                              <Leaf className="w-3 h-3" />
                              CO₂
                            </span>
                          </th>
                          <th className="text-right py-2 font-medium">
                            {t("modelBreakdown.tokens")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.modelBreakdown.map((model) => (
                          <tr
                            key={model.model}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="py-3 font-medium">{model.model}</td>
                            <td className="py-3 text-right">
                              {model.messages.toLocaleString()}
                            </td>
                            <td className="py-3 text-right">
                              {formatCurrency(model.cost)}
                            </td>
                            <td className="py-3 text-right text-green-600 dark:text-green-400">
                              {formatCO2(model.co2)}
                            </td>
                            <td className="py-3 text-right text-[var(--muted-foreground)]">
                              {(model.tokensInput + model.tokensOutput).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Provider Breakdown */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold">{t("providerBreakdown.title")}</h2>
              </CardHeader>
              <CardContent>
                {data.providerBreakdown.length === 0 ? (
                  <p className="text-[var(--muted-foreground)] text-center py-8">
                    {t("providerBreakdown.empty")}
                  </p>
                ) : (
                  <div className="grid md:grid-cols-4 gap-4">
                    {data.providerBreakdown.map((provider) => (
                      <div
                        key={provider.provider}
                        className="p-4 rounded-lg bg-[var(--muted)]"
                      >
                        <p className="font-medium mb-2">{provider.provider}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">
                              Messages
                            </span>
                            <span>{provider.messages.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">
                              {t("stats.cost")}
                            </span>
                            <span>{formatCurrency(provider.cost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">
                              CO₂
                            </span>
                            <span className="text-green-600 dark:text-green-400">
                              {formatCO2(provider.co2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CO2 Methodology */}
            <CO2MethodologyCard />
          </div>
        ) : (
          <div className="text-center py-16 text-[var(--muted-foreground)]">
            {t("noData")}
          </div>
        )}
      </main>
    </div>
  );
}
