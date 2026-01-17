import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  CreditCard,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Wallet,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has accepted terms
  const { data: termsCheck } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("id", user.id)
    .single();

  if (!termsCheck?.terms_accepted_at) {
    redirect("/auth/accept-terms");
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
    .select("cost_eur")
    .eq("user_id", user.id);

  const totalSpent = usageData?.reduce((acc, u) => acc + u.cost_eur, 0) || 0;

  // Fetch recent transactions
  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            iaiaz
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/chat"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Chat
            </Link>
            <Link href="/dashboard/credits">
              <Button size="sm">
                <CreditCard className="w-4 h-4 mr-2" />
                Recharger
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Tableau de bord</h1>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Solde actuel
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
                <div className="w-12 h-12 rounded-lg bg-accent-100 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-accent-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Conversations
                  </p>
                  <p className="text-2xl font-bold">{conversationCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Total utilisé
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalSpent)}
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
              <h2 className="font-semibold">Actions rapides</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/chat">
                <Button variant="outline" className="w-full justify-between">
                  Nouvelle conversation
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard/credits">
                <Button variant="outline" className="w-full justify-between">
                  Acheter des crédits
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Informations du compte</h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">Email</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">
                    Membre depuis
                  </dt>
                  <dd className="font-medium">
                    {new Date(profile?.created_at || "").toLocaleDateString(
                      "fr-FR",
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
            <h2 className="font-semibold">Transactions récentes</h2>
          </CardHeader>
          <CardContent>
            {!transactions || transactions.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                Aucune transaction pour le moment
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-left py-2 font-medium">Type</th>
                      <th className="text-left py-2 font-medium">Description</th>
                      <th className="text-right py-2 font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="py-3 text-[var(--muted-foreground)]">
                          {new Date(tx.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              tx.type === "purchase"
                                ? "bg-green-100 text-green-700"
                                : tx.type === "usage"
                                  ? "bg-blue-100 text-blue-700"
                                  : tx.type === "bonus"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {tx.type === "purchase"
                              ? "Achat"
                              : tx.type === "usage"
                                ? "Utilisation"
                                : tx.type === "bonus"
                                  ? "Bonus"
                                  : tx.type}
                          </span>
                        </td>
                        <td className="py-3 text-[var(--muted-foreground)] truncate max-w-xs">
                          {tx.description || "-"}
                        </td>
                        <td
                          className={`py-3 text-right font-medium ${
                            tx.amount > 0 ? "text-green-600" : "text-red-600"
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
