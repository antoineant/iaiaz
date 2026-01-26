"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StackedBarChart, LineChart } from "@/components/admin/charts";
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  BarChart3,
} from "lucide-react";

interface IncomePeriod {
  period_start: string;
  period_end: string;
  personal_purchases: number;
  org_purchases: number;
  subscription_revenue: number;
  total_revenue: number;         // Cash in (actual money received)
  usage_revenue: number;         // Value of credits consumed (with markup)
  cost_anthropic: number;
  cost_openai: number;
  cost_google: number;
  cost_mistral: number;
  total_cost: number;            // AI costs
  theoretical_margin: number;    // If all usage was paid
  true_margin: number;           // Cash in - AI costs (actual profit)
  credits_outstanding: number;   // Cash in - usage (prepaid not yet used)
  margin_percent: number;
}

interface IncomeTotals {
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
  theoretical_margin: number;
  true_margin: number;
  credits_outstanding: number;
  margin_percent: number;
}

interface IncomeData {
  periods: IncomePeriod[];
  totals: IncomeTotals;
  params: {
    startDate: string;
    endDate: string;
    groupBy: string;
  };
}

type GroupBy = "day" | "week" | "month" | "year";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];

const REVENUE_COLORS = {
  "Achats individuels": "#3b82f6",
  "Achats organisations": "#8b5cf6",
  Abonnements: "#10b981",
};

const COST_COLORS = {
  Anthropic: "#f59e0b",
  OpenAI: "#10b981",
  Google: "#3b82f6",
  Mistral: "#ec4899",
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {description}
              </p>
            )}
            {trend && (
              <p
                className={`text-xs mt-1 flex items-center gap-1 ${
                  trendUp
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {trendUp ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/30">
            <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IncomeDashboard() {
  const [data, setData] = useState<IncomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        groupBy,
      });

      const res = await fetch(`/api/admin/income?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch income data");
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    if (!data) return;

    const headers = [
      "Période",
      "Achats individuels",
      "Achats organisations",
      "Abonnements",
      "Encaissements",
      "Usage consommé",
      "Coût Anthropic",
      "Coût OpenAI",
      "Coût Google",
      "Coût Mistral",
      "Total coûts IA",
      "Vraie marge",
      "Crédits en réserve",
      "Marge %",
    ];

    const rows = data.periods.map((p) => [
      p.period_start,
      Number(p.personal_purchases).toFixed(2),
      Number(p.org_purchases).toFixed(2),
      Number(p.subscription_revenue).toFixed(2),
      Number(p.total_revenue).toFixed(2),
      Number(p.usage_revenue).toFixed(2),
      Number(p.cost_anthropic).toFixed(2),
      Number(p.cost_openai).toFixed(2),
      Number(p.cost_google).toFixed(2),
      Number(p.cost_mistral).toFixed(2),
      Number(p.total_cost).toFixed(2),
      Number(p.true_margin).toFixed(2),
      Number(p.credits_outstanding).toFixed(2),
      Number(p.margin_percent).toFixed(1),
    ]);

    // Add totals row
    rows.push([
      "TOTAL",
      data.totals.personal_purchases.toFixed(2),
      data.totals.org_purchases.toFixed(2),
      data.totals.subscription_revenue.toFixed(2),
      data.totals.total_revenue.toFixed(2),
      data.totals.usage_revenue.toFixed(2),
      data.totals.cost_anthropic.toFixed(2),
      data.totals.cost_openai.toFixed(2),
      data.totals.cost_google.toFixed(2),
      data.totals.cost_mistral.toFixed(2),
      data.totals.total_cost.toFixed(2),
      data.totals.true_margin.toFixed(2),
      data.totals.credits_outstanding.toFixed(2),
      data.totals.margin_percent.toFixed(1),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `income_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const revenueChartData =
    data?.periods.map((p) => ({
      label: formatDateLabel(p.period_start, groupBy),
      values: {
        "Achats individuels": Number(p.personal_purchases) || 0,
        "Achats organisations": Number(p.org_purchases) || 0,
        Abonnements: Number(p.subscription_revenue) || 0,
      },
    })) || [];

  const costChartData =
    data?.periods.map((p) => ({
      label: formatDateLabel(p.period_start, groupBy),
      values: {
        Anthropic: Number(p.cost_anthropic) || 0,
        OpenAI: Number(p.cost_openai) || 0,
        Google: Number(p.cost_google) || 0,
        Mistral: Number(p.cost_mistral) || 0,
      },
    })) || [];

  const marginChartData =
    data?.periods.map((p) => ({
      label: formatDateLabel(p.period_start, groupBy),
      values: {
        "Vraie marge": Number(p.true_margin) || 0,
        "Réserve": Number(p.credits_outstanding) || 0,
      },
    })) || [];

  if (isLoading && !data) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-[var(--muted)] rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-[var(--muted)] rounded-xl"></div>
          ))}
        </div>
        <div className="h-80 bg-[var(--muted)] rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revenus</h1>
          <p className="text-[var(--muted-foreground)]">
            Analyse détaillée des revenus et coûts
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!data}>
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-[var(--background)] text-sm"
              />
              <span className="text-[var(--muted-foreground)]">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-[var(--background)] text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--muted-foreground)]" />
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="px-3 py-2 border rounded-lg bg-[var(--background)] text-sm"
              >
                {GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Encaissements"
            value={`${data.totals.total_revenue.toFixed(2)} €`}
            icon={Euro}
            description="Argent reçu (achats + abo)"
          />
          <StatCard
            title="Usage consommé"
            value={`${data.totals.usage_revenue.toFixed(2)} €`}
            icon={TrendingDown}
            description="Valeur crédits utilisés"
          />
          <StatCard
            title="Coûts IA"
            value={`${data.totals.total_cost.toFixed(2)} €`}
            icon={TrendingDown}
            description="À payer aux fournisseurs"
          />
          <StatCard
            title="Vraie marge"
            value={`${data.totals.true_margin.toFixed(2)} €`}
            icon={Euro}
            trendUp={data.totals.true_margin > 0}
            trend={data.totals.true_margin >= 0 ? "Profit" : "Perte"}
            description="Encaissements - Coûts IA"
          />
          <StatCard
            title="Crédits en réserve"
            value={`${data.totals.credits_outstanding.toFixed(2)} €`}
            icon={BarChart3}
            description="Prépayé non consommé"
            trendUp={data.totals.credits_outstanding >= 0}
            trend={data.totals.credits_outstanding >= 0 ? "Avance clients" : "Crédits gratuits"}
          />
          <StatCard
            title="Marge %"
            value={`${data.totals.margin_percent.toFixed(1)}%`}
            icon={BarChart3}
            trendUp={data.totals.margin_percent > 0}
            description="Vraie marge / Encaissements"
          />
        </div>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Revenus par source</h2>
        </CardHeader>
        <CardContent>
          {revenueChartData.length > 0 ? (
            <StackedBarChart
              data={revenueChartData}
              keys={["Achats individuels", "Achats organisations", "Abonnements"]}
              colors={REVENUE_COLORS}
              formatValue={(v) => `${v.toFixed(2)} €`}
            />
          ) : (
            <p className="text-center text-[var(--muted-foreground)] py-8">
              Aucune donnée pour cette période
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cost Chart */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Coûts par fournisseur</h2>
        </CardHeader>
        <CardContent>
          {costChartData.length > 0 ? (
            <StackedBarChart
              data={costChartData}
              keys={["Anthropic", "OpenAI", "Google", "Mistral"]}
              colors={COST_COLORS}
              formatValue={(v) => `${v.toFixed(2)} €`}
            />
          ) : (
            <p className="text-center text-[var(--muted-foreground)] py-8">
              Aucune donnée pour cette période
            </p>
          )}
        </CardContent>
      </Card>

      {/* Margin Chart */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Évolution de la marge</h2>
        </CardHeader>
        <CardContent>
          {marginChartData.length > 0 ? (
            <LineChart
              data={marginChartData}
              keys={["Vraie marge", "Réserve"]}
              colors={{ "Vraie marge": "#10b981", "Réserve": "#3b82f6" }}
              formatValue={(v) => `${v.toFixed(2)} €`}
            />
          ) : (
            <p className="text-center text-[var(--muted-foreground)] py-8">
              Aucune donnée pour cette période
            </p>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      {data && data.periods.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Détails par période</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Période</th>
                    <th className="text-right py-2 px-2">Encaissé</th>
                    <th className="text-right py-2 px-2">Consommé</th>
                    <th className="text-right py-2 px-2">Coûts IA</th>
                    <th className="text-right py-2 px-2">Vraie marge</th>
                    <th className="text-right py-2 px-2">Réserve</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((p, i) => (
                    <tr key={i} className="border-b hover:bg-[var(--muted)]/50">
                      <td className="py-2 px-2">
                        {formatDateLabel(p.period_start, groupBy)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {Number(p.total_revenue).toFixed(2)} €
                      </td>
                      <td className="text-right py-2 px-2">
                        {Number(p.usage_revenue).toFixed(2)} €
                      </td>
                      <td className="text-right py-2 px-2 text-red-600 dark:text-red-400">
                        {Number(p.total_cost).toFixed(2)} €
                      </td>
                      <td
                        className={`text-right py-2 px-2 font-medium ${
                          (Number(p.true_margin) || 0) >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {(Number(p.true_margin) || 0).toFixed(2)} €
                      </td>
                      <td
                        className={`text-right py-2 px-2 ${
                          (Number(p.credits_outstanding) || 0) >= 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {(Number(p.credits_outstanding) || 0).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold bg-[var(--muted)]/30">
                    <td className="py-2 px-2">TOTAL</td>
                    <td className="text-right py-2 px-2">
                      {data.totals.total_revenue.toFixed(2)} €
                    </td>
                    <td className="text-right py-2 px-2">
                      {data.totals.usage_revenue.toFixed(2)} €
                    </td>
                    <td className="text-right py-2 px-2 text-red-600 dark:text-red-400">
                      {data.totals.total_cost.toFixed(2)} €
                    </td>
                    <td
                      className={`text-right py-2 px-2 ${
                        data.totals.true_margin >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {data.totals.true_margin.toFixed(2)} €
                    </td>
                    <td
                      className={`text-right py-2 px-2 ${
                        data.totals.credits_outstanding >= 0
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-orange-600 dark:text-orange-400"
                      }`}
                    >
                      {data.totals.credits_outstanding.toFixed(2)} €
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatDateLabel(date: string, groupBy: GroupBy): string {
  const d = new Date(date);
  switch (groupBy) {
    case "day":
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    case "week":
      return `S${getWeekNumber(d)}`;
    case "month":
      return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    case "year":
      return d.getFullYear().toString();
    default:
      return date;
  }
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
