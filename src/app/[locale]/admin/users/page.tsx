"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Minus, Shield, User, GraduationCap, Building2, Trash2, Loader2, X, Mail, MailCheck, MailX, RefreshCw } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  account_type: "student" | "trainer" | "school" | "admin";
  credits_balance: number;
  is_admin: boolean;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  last_activity: string | null;
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
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [cleanupPreview, setCleanupPreview] = useState<{ users: Array<{ id: string; email: string; reason: string }>; inactiveDays: number } | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(7);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users?limit=1000");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch {
      setError("Erreur lors du chargement des utilisateurs");
    }
    setIsLoading(false);
  };

  const resendConfirmationEmail = async (userId: string) => {
    setResendingEmail(userId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/resend-confirmation`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de l'envoi");
        return;
      }

      setSuccess("Email de confirmation envoyé");
    } catch {
      setError("Erreur lors de l'envoi de l'email");
    } finally {
      setResendingEmail(null);
    }
  };

  const previewCleanup = async () => {
    setIsCleaningUp(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/cleanup?inactiveDays=${cleanupDays}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de la prévisualisation");
        return;
      }

      setCleanupPreview({ users: data.users, inactiveDays: data.inactiveDays });
    } catch {
      setError("Erreur lors de la prévisualisation");
    } finally {
      setIsCleaningUp(false);
    }
  };

  const executeCleanup = async () => {
    setIsCleaningUp(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/users/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inactiveDays: cleanupDays, dryRun: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors du nettoyage");
        return;
      }

      setSuccess(`${data.deleted?.length || 0} utilisateur(s) supprimé(s)`);
      setCleanupPreview(null);
      fetchUsers();
    } catch {
      setError("Erreur lors du nettoyage");
    } finally {
      setIsCleaningUp(false);
    }
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

  const updateAccountType = async (userId: string, newType: "student" | "trainer" | "school" | "admin") => {
    const supabase = createClient();
    setError("");
    setSuccess("");

    // Get current user to prevent self-demotion
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.id === userId && newType !== "admin") {
      setError("Vous ne pouvez pas retirer vos propres droits admin");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        account_type: newType,
        is_admin: newType === "admin" // Sync for backwards compatibility
      })
      .eq("id", userId);

    if (error) {
      setError("Erreur lors de la modification du type de compte");
      return;
    }

    const typeLabels = {
      student: "Étudiant",
      trainer: "Formateur",
      school: "Établissement",
      admin: "Admin"
    };
    setSuccess(`Type de compte changé en ${typeLabels[newType]}`);
    fetchUsers();
  };

  const deleteUser = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de la suppression");
        return;
      }

      setSuccess(`Utilisateur ${deletingUser.email} supprimé avec succès`);
      setDeletingUser(null);
      fetchUsers();
    } catch {
      setError("Erreur lors de la suppression de l'utilisateur");
    } finally {
      setIsDeleting(false);
    }
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Total
            </p>
            <p className="text-2xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-[var(--muted-foreground)]">Étudiants</p>
            </div>
            <p className="text-2xl font-bold">
              {users.filter((u) => u.account_type === "student").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-green-500" />
              <p className="text-sm text-[var(--muted-foreground)]">Formateurs</p>
            </div>
            <p className="text-2xl font-bold">
              {users.filter((u) => u.account_type === "trainer").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              <p className="text-sm text-[var(--muted-foreground)]">Établissements</p>
            </div>
            <p className="text-2xl font-bold">
              {users.filter((u) => u.account_type === "school").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" />
              <p className="text-sm text-[var(--muted-foreground)]">Admins</p>
            </div>
            <p className="text-2xl font-bold">
              {users.filter((u) => u.account_type === "admin" || u.is_admin).length}
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
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <MailX className="w-4 h-4 text-red-500" />
              <p className="text-sm text-[var(--muted-foreground)]">Non confirmés</p>
            </div>
            <p className="text-2xl font-bold">
              {users.filter((u) => !u.email_confirmed_at).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup section */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Nettoyage automatique</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Supprimer les comptes avec email non confirmé et sans activité
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm">Inactifs depuis</label>
              <Input
                type="number"
                min="1"
                max="365"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(parseInt(e.target.value) || 7)}
                className="w-20"
              />
              <span className="text-sm">jours</span>
            </div>
            <Button
              variant="outline"
              onClick={previewCleanup}
              disabled={isCleaningUp}
            >
              {isCleaningUp ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Prévisualiser
            </Button>
          </div>

          {cleanupPreview && (
            <div className="mt-4 p-4 border border-[var(--border)] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium">
                  {cleanupPreview.users.length} utilisateur(s) à supprimer
                </p>
                {cleanupPreview.users.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCleanupPreview(null)}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={executeCleanup}
                      disabled={isCleaningUp}
                    >
                      {isCleaningUp ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
              {cleanupPreview.users.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {cleanupPreview.users.map((u) => (
                    <div key={u.id} className="text-sm p-2 bg-[var(--muted)] rounded">
                      <span className="font-medium">{u.email}</span>
                      <p className="text-xs text-[var(--muted-foreground)]">{u.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Aucun utilisateur à supprimer avec ces critères.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
            {filteredUsers.map((user) => {
              const accountType = user.account_type || (user.is_admin ? "admin" : "student");
              const accountTypeConfig = {
                student: { icon: User, label: "Étudiant", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
                trainer: { icon: GraduationCap, label: "Formateur", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
                school: { icon: Building2, label: "Établissement", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
                admin: { icon: Shield, label: "Admin", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
              };
              const config = accountTypeConfig[accountType as keyof typeof accountTypeConfig];
              const TypeIcon = config.icon;

              return (
                <div
                  key={user.id}
                  className="p-4 flex items-center justify-between hover:bg-[var(--muted)]/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{user.display_name || user.email}</span>
                      <span className={`px-2 py-0.5 text-xs ${config.bg} ${config.text} rounded-full flex items-center gap-1`}>
                        <TypeIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                      {/* Email confirmation status */}
                      {user.email_confirmed_at ? (
                        <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1" title="Email confirmé">
                          <MailCheck className="w-3 h-3" />
                          Confirmé
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full flex items-center gap-1" title="Email non confirmé">
                          <MailX className="w-3 h-3" />
                          Non confirmé
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {user.display_name ? user.email + " • " : ""}
                      Inscrit le{" "}
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                      {user.last_activity && (
                        <> • Dernière activité: {new Date(user.last_activity).toLocaleDateString("fr-FR")}</>
                      )}
                      {!user.last_activity && user.last_sign_in_at && (
                        <> • Dernière connexion: {new Date(user.last_sign_in_at).toLocaleDateString("fr-FR")}</>
                      )}
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUserId(user.id)}
                        >
                          Crédits
                        </Button>
                        {/* Resend confirmation email button */}
                        {!user.email_confirmed_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resendConfirmationEmail(user.id)}
                            disabled={resendingEmail === user.id}
                            title="Renvoyer l'email de confirmation"
                          >
                            {resendingEmail === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <select
                          value={accountType}
                          onChange={(e) => updateAccountType(user.id, e.target.value as "student" | "trainer" | "school" | "admin")}
                          className="text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--background)] cursor-pointer"
                        >
                          <option value="student">Étudiant</option>
                          <option value="trainer">Formateur</option>
                          <option value="school">Établissement</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingUser(user)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--background)] rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
                Supprimer l&apos;utilisateur
              </h2>
              <button
                onClick={() => setDeletingUser(null)}
                className="p-1 hover:bg-[var(--muted)] rounded"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-[var(--muted-foreground)] mb-4">
                Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est{" "}
                <strong className="text-red-600 dark:text-red-400">irréversible</strong>.
              </p>

              <div className="p-3 bg-[var(--muted)] rounded-lg">
                <p className="font-medium">{deletingUser.display_name || deletingUser.email}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{deletingUser.email}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Solde: {deletingUser.credits_balance.toFixed(2)} €
                </p>
              </div>

              <p className="text-sm text-[var(--muted-foreground)] mt-4">
                Toutes les données associées seront supprimées :
              </p>
              <ul className="text-sm text-[var(--muted-foreground)] list-disc list-inside mt-1">
                <li>Conversations et messages</li>
                <li>Fichiers uploadés</li>
                <li>Historique des crédits</li>
                <li>Appartenances aux organisations</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDeletingUser(null)}
                className="flex-1"
                disabled={isDeleting}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={deleteUser}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
