"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Minus, Shield, ShieldOff } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  credits_balance: number;
  is_admin: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");

  const fetchUsers = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, credits_balance, is_admin, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError("Erreur lors du chargement des utilisateurs");
    } else {
      setUsers(data || []);
      setFilteredUsers(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter((u) =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const addCredits = async (userId: string) => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Veuillez entrer un montant valide");
      return;
    }

    const supabase = createClient();
    setError("");
    setSuccess("");

    // Get current balance
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const newBalance = user.credits_balance + amount;

    // Update balance
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits_balance: newBalance })
      .eq("id", userId);

    if (updateError) {
      setError("Erreur lors de l'ajout des crédits");
      return;
    }

    // Log the transaction
    await supabase.from("credit_transactions").insert([
      {
        user_id: userId,
        amount: amount,
        type: "admin_credit",
        description: "Crédit ajouté par admin",
      },
    ]);

    setSuccess(`${amount.toFixed(2)} € ajoutés avec succès`);
    setEditingUserId(null);
    setCreditAmount("");
    fetchUsers();
  };

  const removeCredits = async (userId: string) => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Veuillez entrer un montant valide");
      return;
    }

    const supabase = createClient();
    setError("");
    setSuccess("");

    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const newBalance = Math.max(0, user.credits_balance - amount);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits_balance: newBalance })
      .eq("id", userId);

    if (updateError) {
      setError("Erreur lors du retrait des crédits");
      return;
    }

    await supabase.from("credit_transactions").insert([
      {
        user_id: userId,
        amount: -amount,
        type: "admin_debit",
        description: "Crédit retiré par admin",
      },
    ]);

    setSuccess(`${amount.toFixed(2)} € retirés avec succès`);
    setEditingUserId(null);
    setCreditAmount("");
    fetchUsers();
  };

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    const supabase = createClient();
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !currentStatus })
      .eq("id", userId);

    if (error) {
      setError("Erreur lors de la modification du statut admin");
      return;
    }

    setSuccess(
      currentStatus ? "Droits admin retirés" : "Droits admin accordés"
    );
    fetchUsers();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--muted)] rounded w-48"></div>
        <div className="h-10 bg-[var(--muted)] rounded"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-[var(--muted)] rounded-xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <p className="text-[var(--muted-foreground)]">
          Gérer les utilisateurs et leurs crédits
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Rechercher par email..."
          className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Total utilisateurs
            </p>
            <p className="text-2xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-[var(--muted-foreground)]">Admins</p>
            <p className="text-2xl font-bold">
              {users.filter((u) => u.is_admin).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Crédits totaux
            </p>
            <p className="text-2xl font-bold">
              {users
                .reduce((sum, u) => sum + u.credits_balance, 0)
                .toFixed(2)}{" "}
              €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users list */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {filteredUsers.length} utilisateur
            {filteredUsers.length > 1 ? "s" : ""}
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border)]">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between hover:bg-[var(--muted)]/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.email}</span>
                    {user.is_admin && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Inscrit le{" "}
                    {new Date(user.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">
                      {user.credits_balance.toFixed(2)} €
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Solde
                    </p>
                  </div>

                  {editingUserId === user.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Montant"
                        className="w-24"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => addCredits(user.id)}
                        title="Ajouter"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeCredits(user.id)}
                        title="Retirer"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingUserId(null);
                          setCreditAmount("");
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingUserId(user.id)}
                      >
                        Modifier crédits
                      </Button>
                      <button
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_admin
                            ? "bg-purple-100 text-purple-600 hover:bg-purple-200"
                            : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                        }`}
                        title={
                          user.is_admin
                            ? "Retirer droits admin"
                            : "Donner droits admin"
                        }
                      >
                        {user.is_admin ? (
                          <ShieldOff className="w-4 h-4" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
