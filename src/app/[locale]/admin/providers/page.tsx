"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart } from "@/components/admin/charts";
import {
  AlertTriangle,
  Check,
  Edit2,
  X,
  Server,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

interface ProviderSpend {
  provider: string;
  spend_eur: number;
  message_count: number;
  tokens_input: number;
  tokens_output: number;
  budget_eur: number | null;
  budget_percent: number;
}

interface ProviderBudget {
  id: string;
  provider: string;
  monthly_budget_eur: number | null;
  alert_threshold_50: boolean;
  alert_threshold_75: boolean;
  alert_threshold_90: boolean;
  alert_threshold_100: boolean;
  manual_balance_eur: number | null;
  manual_balance_updated_at: string | null;
  notes: string | null;
}

interface ProviderAlert {
  id: string;
  provider: string;
  alert_type: string;
  month_year: string;
  spend_eur: number;
  budget_eur: number;
  percentage: number;
  acknowledged: boolean;
  created_at: string;
}

interface HistoryData {
  byMonth: Record<string, Record<string, { spend_eur: number; message_count: number }>>;
}

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "#f59e0b",
  OpenAI: "#10b981",
  Google: "#3b82f6",
  Mistral: "#ec4899",
};

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${percent}%`,
          backgroundColor: percent > 90 ? "#ef4444" : percent > 75 ? "#f59e0b" : color,
        }}
      />
    </div>
  );
}

function BudgetModal({
  budget,
  onClose,
  onSave,
}: {
  budget: ProviderBudget;
  onClose: () => void;
  onSave: (data: Partial<ProviderBudget>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    monthly_budget_eur: budget.monthly_budget_eur || "",
    alert_threshold_50: budget.alert_threshold_50,
    alert_threshold_75: budget.alert_threshold_75,
    alert_threshold_90: budget.alert_threshold_90,
    alert_threshold_100: budget.alert_threshold_100,
    manual_balance_eur: budget.manual_balance_eur || "",
    notes: budget.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      provider: budget.provider,
      monthly_budget_eur: form.monthly_budget_eur ? Number(form.monthly_budget_eur) : null,
      alert_threshold_50: form.alert_threshold_50,
      alert_threshold_75: form.alert_threshold_75,
      alert_threshold_90: form.alert_threshold_90,
      alert_threshold_100: form.alert_threshold_100,
      notes: form.notes || null,
    });
    setSaving(false);
    onClose();
  };

  const handleManualBalanceUpdate = async () => {
    if (!form.manual_balance_eur) return;
    setSaving(true);
    await fetch("/api/admin/providers/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: budget.provider,
        manual_balance_eur: Number(form.manual_balance_eur),
      }),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--background)] rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Configuration {budget.provider}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--muted)] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Budget mensuel (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.monthly_budget_eur}
              onChange={(e) =>
                setForm({ ...form, monthly_budget_eur: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg bg-[var(--background)]"
              placeholder="Ex: 500.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Alertes de seuil
            </label>
            <div className="space-y-2">
              {[50, 75, 90, 100].map((threshold) => {
                const key = `alert_threshold_${threshold}` as keyof typeof form;
                return (
                  <label key={threshold} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form[key] as boolean}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">Alerte à {threshold}%</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] text-sm"
              rows={2}
              placeholder="Notes optionnelles..."
            />
          </div>

          <hr className="my-4" />

          <div>
            <label className="block text-sm font-medium mb-1">
              Solde manuel (€)
            </label>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">
              Pour les fournisseurs sans API (Google, Mistral)
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={form.manual_balance_eur}
                onChange={(e) =>
                  setForm({ ...form, manual_balance_eur: e.target.value })
                }
                className="flex-1 px-3 py-2 border rounded-lg bg-[var(--background)]"
                placeholder="Ex: 100.00"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleManualBalanceUpdate}
                disabled={saving || !form.manual_balance_eur}
              >
                Mettre à jour
              </Button>
            </div>
            {budget.manual_balance_updated_at && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Dernière mise à jour:{" "}
                {new Date(budget.manual_balance_updated_at).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderSpend[]>([]);
  const [budgets, setBudgets] = useState<ProviderBudget[]>([]);
  const [alerts, setAlerts] = useState<ProviderAlert[]>([]);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBudget, setEditingBudget] = useState<ProviderBudget | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [providersRes, budgetsRes, alertsRes, historyRes] = await Promise.all([
        fetch("/api/admin/providers"),
        fetch("/api/admin/providers/budgets"),
        fetch("/api/admin/providers/alerts"),
        fetch("/api/admin/providers/history?months=6"),
      ]);

      if (!providersRes.ok || !budgetsRes.ok || !alertsRes.ok || !historyRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [providersData, budgetsData, alertsData, historyData] = await Promise.all([
        providersRes.json(),
        budgetsRes.json(),
        alertsRes.json(),
        historyRes.json(),
      ]);

      setProviders(providersData.providers || []);
      setBudgets(budgetsData.budgets || []);
      setAlerts(alertsData.alerts || []);
      setHistory(historyData);
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const acknowledgeAlert = async (alertId: string) => {
    await fetch(`/api/admin/providers/alerts/${alertId}/acknowledge`, {
      method: "PUT",
    });
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const saveBudget = async (data: Partial<ProviderBudget>) => {
    await fetch("/api/admin/providers/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchData();
  };

  // Prepare history chart data
  const historyChartData = history
    ? Object.entries(history.byMonth)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, providers]) => ({
          label: month,
          values: Object.fromEntries(
            Object.entries(providers).map(([p, d]) => [p, d.spend_eur])
          ),
        }))
    : [];

  const getBudgetForProvider = (provider: string) =>
    budgets.find((b) => b.provider === provider);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-[var(--muted)] rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-[var(--muted)] rounded-xl"></div>
          ))}
        </div>
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
      <div>
        <h1 className="text-2xl font-bold">Fournisseurs IA</h1>
        <p className="text-[var(--muted-foreground)]">
          Suivi des dépenses et gestion des budgets
        </p>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {alert.provider} - Seuil {alert.alert_type.replace("threshold_", "")}% atteint
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Dépenses: {Number(alert.spend_eur).toFixed(2)} € /{" "}
                    {Number(alert.budget_eur).toFixed(2)} € ({Number(alert.percentage).toFixed(1)}%)
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => acknowledgeAlert(alert.id)}
              >
                <Check className="w-4 h-4 mr-1" />
                OK
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const budget = getBudgetForProvider(p.provider);
          const color = PROVIDER_COLORS[p.provider] || "#6b7280";

          return (
            <Card key={p.provider}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Server className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{p.provider}</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {new Date().toLocaleDateString("fr-FR", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => budget && setEditingBudget(budget)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Spend */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--muted-foreground)]">
                        Dépenses
                      </span>
                      <span className="font-medium">
                        {Number(p.spend_eur).toFixed(2)} €
                        {p.budget_eur && (
                          <span className="text-[var(--muted-foreground)]">
                            {" "}
                            / {Number(p.budget_eur).toFixed(2)} €
                          </span>
                        )}
                      </span>
                    </div>
                    {p.budget_eur && (
                      <ProgressBar
                        value={Number(p.spend_eur)}
                        max={Number(p.budget_eur)}
                        color={color}
                      />
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[var(--muted-foreground)]" />
                      <div>
                        <p className="text-sm font-medium">
                          {Number(p.message_count).toLocaleString()}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          messages
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[var(--muted-foreground)]" />
                      <div>
                        <p className="text-sm font-medium">
                          {Number(p.budget_percent).toFixed(1)}%
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          du budget
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Manual balance (for Google/Mistral) */}
                  {budget?.manual_balance_eur && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted-foreground)]">
                          Solde prépayé
                        </span>
                        <span className="font-medium">
                          {Number(budget.manual_balance_eur).toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* History Chart */}
      {historyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Historique des dépenses (6 mois)</h2>
          </CardHeader>
          <CardContent>
            <LineChart
              data={historyChartData}
              keys={Object.keys(PROVIDER_COLORS)}
              colors={PROVIDER_COLORS}
              formatValue={(v) => `${v.toFixed(2)} €`}
            />
          </CardContent>
        </Card>
      )}

      {/* Budget Modal */}
      {editingBudget && (
        <BudgetModal
          budget={editingBudget}
          onClose={() => setEditingBudget(null)}
          onSave={saveBudget}
        />
      )}
    </div>
  );
}
