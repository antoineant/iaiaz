"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Loader2,
  AlertCircle,
  MessageSquare,
  Users,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface OrgMetrics {
  total_messages: number;
  total_conversations: number;
  total_cost: number;
  total_employees: number;
  active_employees: number;
  model_usage: Record<string, number>;
  peak_hours: number[];
  daily_usage: Array<{ date: string; messages: number; cost: number }>;
  top_employees: Array<{ id: string; name: string; messages: number; cost: number }>;
}

interface AnalyticsData {
  organization_name: string;
  period: number;
  metrics: OrgMetrics;
}

export default function OrgAnalyticsPage() {
  const t = useTranslations("org.analytics");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/org/analytics?period=${period}`);
      if (!response.ok) throw new Error("Failed to load analytics");
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">{t("error")}</p>
        <p className="text-[var(--muted-foreground)]">{error}</p>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-[var(--muted-foreground)]">{data.organization_name}</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--muted-foreground)]">{t("period")}:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="p-2 border rounded-lg bg-background text-sm"
          >
            <option value={7}>{t("last7days")}</option>
            <option value={30}>{t("last30days")}</option>
            <option value={90}>{t("last90days")}</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label={t("totalMessages")}
          value={metrics.total_messages.toString()}
          color="blue"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label={t("activeEmployees")}
          value={`${metrics.active_employees}/${metrics.total_employees}`}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label={t("totalCost")}
          value={`€${metrics.total_cost.toFixed(2)}`}
          color="purple"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label={t("conversations")}
          value={metrics.total_conversations.toString()}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Usage Chart */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t("dailyUsage")}</h2>
          </CardHeader>
          <CardContent>
            {metrics.daily_usage.length > 0 ? (
              <div className="h-48">
                <SimpleBarChart data={metrics.daily_usage} />
              </div>
            ) : (
              <p className="text-[var(--muted-foreground)] text-center py-8">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Model Usage */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t("modelUsage")}</h2>
          </CardHeader>
          <CardContent>
            {Object.keys(metrics.model_usage).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(metrics.model_usage)
                  .sort(([, a], [, b]) => b - a)
                  .map(([model, count]) => {
                    const total = Object.values(metrics.model_usage).reduce((a, b) => a + b, 0);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={model}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="truncate">{model}</span>
                          <span className="text-[var(--muted-foreground)]">{percentage}%</span>
                        </div>
                        <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-[var(--muted-foreground)] text-center py-8">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Employees */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t("topEmployees")}</h2>
          </CardHeader>
          <CardContent>
            {metrics.top_employees.length > 0 ? (
              <div className="space-y-3">
                {metrics.top_employees.slice(0, 5).map((employee, index) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--muted)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-medium text-primary-600">
                        {index + 1}
                      </span>
                      <span className="font-medium">{employee.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{employee.messages} {t("messages")}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        €{employee.cost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--muted-foreground)] text-center py-8">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t("peakHours")}</h2>
          </CardHeader>
          <CardContent>
            {metrics.peak_hours.length > 0 ? (
              <div className="flex items-center justify-center gap-4 py-8">
                {metrics.peak_hours.map((hour) => (
                  <div
                    key={hour}
                    className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl"
                  >
                    <p className="text-2xl font-bold text-primary-600">{hour}h</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {hour < 12 ? "AM" : "PM"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--muted-foreground)] text-center py-8">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Simple stat card component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple bar chart component
function SimpleBarChart({
  data,
}: {
  data: Array<{ date: string; messages: number; cost: number }>;
}) {
  const maxMessages = Math.max(...data.map((d) => d.messages), 1);

  return (
    <div className="flex items-end gap-1 h-full">
      {data.slice(-14).map((day) => {
        const height = (day.messages / maxMessages) * 100;
        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className="w-full bg-primary-500 rounded-t-sm min-h-[2px] transition-all"
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${day.date}: ${day.messages} messages`}
            />
            <span className="text-[10px] text-[var(--muted-foreground)] truncate w-full text-center">
              {new Date(day.date).getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
