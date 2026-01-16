"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  MessageSquare,
  CreditCard,
  TrendingUp,
  Bot,
  Euro,
} from "lucide-react";

interface AdminStats {
  total_users: number;
  total_credits_balance: number;
  total_conversations: number;
  total_messages: number;
  total_revenue: number;
  total_usage: number;
  users_today: number;
  revenue_today: number;
  active_models: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: string;
}

function StatCard({ title, value, icon: Icon, description, trend }: StatCardProps) {
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
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-primary-50">
            <Icon className="w-6 h-6 text-primary-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc("get_admin_stats");

      if (error) {
        setError("Erreur lors du chargement des statistiques");
        console.error(error);
      } else {
        setStats(data);
      }

      setIsLoading(false);
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-[var(--muted)] rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-[var(--muted)] rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  const profit = (stats?.total_revenue || 0) - (stats?.total_usage || 0);
  const profitMargin = stats?.total_revenue
    ? ((profit / stats.total_revenue) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted-foreground)]">
          Vue d'ensemble de la plateforme iaiaz
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Utilisateurs"
          value={stats?.total_users || 0}
          icon={Users}
          description={`+${stats?.users_today || 0} aujourd'hui`}
        />

        <StatCard
          title="Conversations"
          value={stats?.total_conversations || 0}
          icon={MessageSquare}
        />

        <StatCard
          title="Messages"
          value={stats?.total_messages || 0}
          icon={MessageSquare}
        />

        <StatCard
          title="Revenus totaux"
          value={`${(stats?.total_revenue || 0).toFixed(2)} €`}
          icon={Euro}
          description={`+${(stats?.revenue_today || 0).toFixed(2)} € aujourd'hui`}
        />

        <StatCard
          title="Coûts API"
          value={`${(stats?.total_usage || 0).toFixed(2)} €`}
          icon={CreditCard}
        />

        <StatCard
          title="Profit"
          value={`${profit.toFixed(2)} €`}
          icon={TrendingUp}
          description={`Marge: ${profitMargin}%`}
        />

        <StatCard
          title="Crédits en circulation"
          value={`${(stats?.total_credits_balance || 0).toFixed(2)} €`}
          icon={CreditCard}
          description="Solde total des utilisateurs"
        />

        <StatCard
          title="Modèles actifs"
          value={stats?.active_models || 0}
          icon={Bot}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Actions rapides</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/models"
              className="block p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-colors"
            >
              <span className="font-medium">Gérer les modèles</span>
              <p className="text-sm text-[var(--muted-foreground)]">
                Ajouter, modifier ou désactiver des modèles IA
              </p>
            </a>
            <a
              href="/admin/users"
              className="block p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-colors"
            >
              <span className="font-medium">Gérer les utilisateurs</span>
              <p className="text-sm text-[var(--muted-foreground)]">
                Voir les utilisateurs et ajuster leurs crédits
              </p>
            </a>
            <a
              href="/admin/settings"
              className="block p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-colors"
            >
              <span className="font-medium">Paramètres</span>
              <p className="text-sm text-[var(--muted-foreground)]">
                Configurer le markup et les crédits gratuits
              </p>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Informations</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Markup actuel</span>
              <span className="font-medium">50%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Crédits gratuits</span>
              <span className="font-medium">1.00 €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Seuil alerte solde</span>
              <span className="font-medium">0.50 €</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
