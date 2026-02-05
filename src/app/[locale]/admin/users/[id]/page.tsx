"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditAdjustmentModal } from "@/components/admin/credit-adjustment-modal";
import { formatCurrency, formatCO2 } from "@/lib/utils";
import {
  ArrowLeft,
  Wallet,
  Leaf,
  MessageSquare,
  Zap,
  User,
  Shield,
  GraduationCap,
  Building2,
  Briefcase,
  MailCheck,
  MailX,
  Loader2,
  CreditCard,
  MessagesSquare,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  account_type: string;
  is_admin: boolean;
  credits_balance: number;
  created_at: string;
  updated_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

interface Totals {
  cost: number;
  co2: number;
  tokensInput: number;
  tokensOutput: number;
  messages: number;
}

interface UserAnalytics {
  profile: UserProfile;
  period: { days: number; startDate: string; endDate: string };
  totals: Totals;
  allTimeTotals: Totals;
  creditSummary: { balance: number; totalPurchased: number; totalUsed: number };
  dailyData: Array<{ date: string; cost: number; co2: number; messages: number }>;
  modelBreakdown: Array<{ model: string; messages: number; cost: number; co2: number; tokensInput: number; tokensOutput: number }>;
  providerBreakdown: Array<{ provider: string; messages: number; cost: number; co2: number }>;
  recentTransactions: Array<{ id: string; amount: number; type: string; description: string; created_at: string }>;
  recentConversations: Array<{ id: string; title: string; model: string; created_at: string; updated_at: string; message_count: number }>;
  organizations: Array<{ id: string; name: string; role: string; credits_allocated: number; credits_used: number }>;
}

const accountTypeConfig: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  student: { icon: User, label: "Étudiant", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  trainer: { icon: GraduationCap, label: "Formateur", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
  school: { icon: Building2, label: "Établissement", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
  business: { icon: Briefcase, label: "Entreprise", bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-400" },
  admin: { icon: Shield, label: "Admin", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
};

function SimpleBarChart({
  data,
  dataKey,
  formatValue,
  color,
}: {
  data: Array<{ date: string; [key: string]: number | string }>;
  dataKey: string;
  formatValue: (v: number) => string;
  color: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-[var(--muted-foreground)] text-sm">
        Pas de données pour cette période
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Number(d[dataKey]) || 0));
  const safeMax = maxValue || 1;

  return (
    <div className="flex items-end gap-1 h-32">
      {data.slice(-14).map((item, index) => {
        const value = Number(item[dataKey]) || 0;
        const height = (value / safeMax) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full ${color} rounded-t transition-all`}
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${new Date(item.date).toLocaleDateString("fr-FR")}: ${formatValue(value)}`}
            />
            {index % 2 === 0 && (
              <span className="text-[10px] text-[var(--muted-foreground)] transform -rotate-45 origin-top-left whitespace-nowrap">
                {new Date(item.date).toLocaleDateString("fr-FR", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [data, setData] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/analytics?days=${days}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/users" className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm">
          <ArrowLeft className="w-4 h-4" />
          Retour aux utilisateurs
        </Link>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { profile, totals, allTimeTotals, creditSummary, dailyData, modelBreakdown, providerBreakdown, recentTransactions, recentConversations, organizations } = data;
  const typeConfig = accountTypeConfig[profile.account_type] || accountTypeConfig.student;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/admin/users" className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm">
        <ArrowLeft className="w-4 h-4" />
        Retour aux utilisateurs
      </Link>

      {/* Profile header */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{profile.display_name || profile.email}</h1>
                <span className={`px-2.5 py-1 text-xs ${typeConfig.bg} ${typeConfig.text} rounded-full flex items-center gap-1`}>
                  <TypeIcon className="w-3 h-3" />
                  {typeConfig.label}
                </span>
              </div>
              {profile.display_name && (
                <p className="text-[var(--muted-foreground)]">{profile.email}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)] flex-wrap">
                <span>Inscrit le {new Date(profile.created_at).toLocaleDateString("fr-FR")}</span>
                {profile.last_sign_in_at && (
                  <span>Dernière connexion: {new Date(profile.last_sign_in_at).toLocaleDateString("fr-FR")}</span>
                )}
                {profile.email_confirmed_at ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <MailCheck className="w-3.5 h-3.5" />
                    Email confirmé
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <MailX className="w-3.5 h-3.5" />
                    Email non confirmé
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              ID: <code className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-xs">{profile.id}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Crédits
            </h2>
            <Button size="sm" onClick={() => setShowCreditModal(true)}>
              Ajuster les crédits
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">{creditSummary.balance.toFixed(2)} €</p>
              <p className="text-sm text-[var(--muted-foreground)]">Solde actuel</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">+{creditSummary.totalPurchased.toFixed(2)} €</p>
              <p className="text-sm text-[var(--muted-foreground)]">Total acheté</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{creditSummary.totalUsed.toFixed(2)} €</p>
              <p className="text-sm text-[var(--muted-foreground)]">Total consommé</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Utilisation</h2>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? "primary" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d} jours
              </Button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement...
          </div>
        )}

        {/* Stat cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Messages</p>
                  <p className="text-2xl font-bold">{totals.messages.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Coût</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.cost)}</p>
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
                  <p className="text-sm text-[var(--muted-foreground)]">CO₂</p>
                  <p className="text-2xl font-bold">{formatCO2(totals.co2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Tokens</p>
                  <p className="text-2xl font-bold">{(totals.tokensInput + totals.tokensOutput).toLocaleString()}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{totals.tokensInput.toLocaleString()} in / {totals.tokensOutput.toLocaleString()} out</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">Coût par jour</h3>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={dailyData}
                dataKey="cost"
                formatValue={(v) => formatCurrency(v)}
                color="bg-primary-500"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm">Messages par jour</h3>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={dailyData}
                dataKey="messages"
                formatValue={(v) => v.toString()}
                color="bg-accent-500"
              />
            </CardContent>
          </Card>
        </div>

        {/* Model breakdown */}
        {modelBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Modèles utilisés</h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 font-medium">Modèle</th>
                      <th className="text-right py-2 font-medium">Messages</th>
                      <th className="text-right py-2 font-medium">Coût</th>
                      <th className="text-right py-2 font-medium">CO₂</th>
                      <th className="text-right py-2 font-medium">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelBreakdown.map((model) => (
                      <tr key={model.model} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-3 font-medium">{model.model}</td>
                        <td className="py-3 text-right">{model.messages.toLocaleString()}</td>
                        <td className="py-3 text-right">{formatCurrency(model.cost)}</td>
                        <td className="py-3 text-right text-green-600 dark:text-green-400">{formatCO2(model.co2)}</td>
                        <td className="py-3 text-right text-[var(--muted-foreground)]">{(model.tokensInput + model.tokensOutput).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provider breakdown */}
        {providerBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Fournisseurs</h3>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                {providerBreakdown.map((provider) => (
                  <div key={provider.provider} className="p-4 rounded-lg bg-[var(--muted)]">
                    <p className="font-medium mb-2">{provider.provider}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--muted-foreground)]">Messages</span>
                        <span>{provider.messages.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--muted-foreground)]">Coût</span>
                        <span>{formatCurrency(provider.cost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--muted-foreground)]">CO₂</span>
                        <span className="text-green-600 dark:text-green-400">{formatCO2(provider.co2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent conversations */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <MessagesSquare className="w-5 h-5" />
            Conversations récentes
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {recentConversations.length === 0 ? (
            <p className="text-[var(--muted-foreground)] text-center py-8 text-sm">Aucune conversation</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 font-medium">Titre</th>
                    <th className="text-left py-3 px-4 font-medium">Modèle</th>
                    <th className="text-right py-3 px-4 font-medium">Messages</th>
                    <th className="text-right py-3 px-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentConversations.map((conv) => (
                    <tr key={conv.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50">
                      <td className="py-3 px-4 max-w-xs truncate">{conv.title || "Sans titre"}</td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">{conv.model}</td>
                      <td className="py-3 px-4 text-right">{conv.message_count}</td>
                      <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">
                        {new Date(conv.updated_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit transactions */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Historique des crédits
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {recentTransactions.length === 0 ? (
            <p className="text-[var(--muted-foreground)] text-center py-8 text-sm">Aucune transaction</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-right py-3 px-4 font-medium">Montant</th>
                    <th className="text-left py-3 px-4 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => {
                    const typeLabels: Record<string, { label: string; bg: string; text: string }> = {
                      purchase: { label: "Achat", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
                      usage: { label: "Utilisation", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
                      bonus: { label: "Bonus", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
                      admin_credit: { label: "Admin +", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
                      admin_debit: { label: "Admin -", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
                      refund: { label: "Remboursement", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
                    };
                    const typeInfo = typeLabels[tx.type] || { label: tx.type, bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-400" };

                    return (
                      <tr key={tx.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-3 px-4 text-[var(--muted-foreground)]">
                          {new Date(tx.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${typeInfo.bg} ${typeInfo.text}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)} €
                        </td>
                        <td className="py-3 px-4 text-[var(--muted-foreground)] max-w-xs truncate">
                          {tx.description || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization membership */}
      {organizations.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organisations
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 font-medium">Organisation</th>
                    <th className="text-left py-3 px-4 font-medium">Rôle</th>
                    <th className="text-right py-3 px-4 font-medium">Crédits alloués</th>
                    <th className="text-right py-3 px-4 font-medium">Crédits utilisés</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-3 px-4 font-medium">{org.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          {org.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">{org.credits_allocated.toFixed(2)} €</td>
                      <td className="py-3 px-4 text-right">{org.credits_used.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit adjustment modal */}
      <CreditAdjustmentModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        userId={profile.id}
        userEmail={profile.email}
        userBalance={creditSummary.balance}
        onSuccess={fetchData}
      />
    </div>
  );
}
