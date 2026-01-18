"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Copy,
  Check,
  Loader2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Invite {
  id: string;
  email: string;
  role: string;
  class_name?: string;
  credit_amount: number;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export default function OrgInvitesPage() {
  const t = useTranslations("org.invites");
  const tRoles = useTranslations("org.roles");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [className, setClassName] = useState("");
  const [creditAmount, setCreditAmount] = useState("5");
  const [expiresInDays, setExpiresInDays] = useState("7");

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Get user's organization
    const { data: orgMember } = await supabase.rpc("get_user_organization", {
      p_user_id: user.id,
    });

    if (!orgMember || orgMember.length === 0) return;

    const organizationId = orgMember[0].organization_id;
    setOrgId(organizationId);

    // Get all invites
    const { data: invitesData } = await supabase
      .from("organization_invites")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (invitesData) {
      setInvites(invitesData);
    }

    setIsLoading(false);
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !email.trim()) return;

    setIsCreating(true);
    setSuccessMessage(null);

    const supabase = createClient();

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

    const { error } = await supabase.from("organization_invites").insert({
      organization_id: orgId,
      email: email.trim(),
      role,
      class_name: className.trim() || null,
      credit_amount: parseFloat(creditAmount),
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("Error creating invite:", error);
    } else {
      // Reset form
      setEmail("");
      setClassName("");
      setCreditAmount("5");
      setSuccessMessage(t("success"));

      // Reload invites
      await loadInvites();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    }

    setIsCreating(false);
  };

  const copyInviteLink = async (invite: Invite) => {
    const link = `${window.location.origin}/join?token=${invite.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-orange-500" />;
      case "accepted":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "expired":
      case "revoked":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "accepted":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");
  const otherInvites = invites.filter((i) => i.status !== "pending");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

      {/* Create invite form */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="font-semibold">{t("create")}</h2>
        </CardHeader>
        <CardContent>
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              {successMessage}
            </div>
          )}

          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="email"
                label={t("email")}
                placeholder="etudiant@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("role")}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]"
                >
                  <option value="student">{tRoles("student")}</option>
                  <option value="teacher">{tRoles("teacher")}</option>
                  <option value="admin">{tRoles("admin")}</option>
                </select>
              </div>

              <Input
                type="text"
                label={t("class")}
                placeholder="MBA 2025"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />

              <Input
                type="number"
                label={t("credits")}
                placeholder="5.00"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("expiresIn")}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]"
                  >
                    <option value="3">3 {t("days")}</option>
                    <option value="7">7 {t("days")}</option>
                    <option value="14">14 {t("days")}</option>
                    <option value="30">30 {t("days")}</option>
                  </select>
                </div>
              </div>
            </div>

            <Button type="submit" isLoading={isCreating}>
              <Send className="w-4 h-4 mr-2" />
              {t("send")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <h2 className="font-semibold">
              {t("pending")} ({pendingInvites.length})
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("email")}
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("role")}
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("class")}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("credits")}
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("expiresIn")}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvites.map((invite) => (
                    <tr
                      key={invite.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="p-4">{invite.email}</td>
                      <td className="p-4">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800">
                          {tRoles(invite.role)}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--muted-foreground)]">
                        {invite.class_name || "-"}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {invite.credit_amount.toFixed(2)}€
                      </td>
                      <td className="p-4 text-[var(--muted-foreground)]">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invite)}
                        >
                          {copiedId === invite.id ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              {t("linkCopied")}
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              {t("copyLink")}
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other invites (accepted, expired) */}
      {otherInvites.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">
              {t("accepted")} / {t("expired")}
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("email")}
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("status")}
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("sentAt")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {otherInvites.map((invite) => (
                    <tr
                      key={invite.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="p-4">{invite.email}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            invite.status
                          )}`}
                        >
                          {getStatusIcon(invite.status)}
                          {invite.status === "accepted"
                            ? t("accepted")
                            : t("expired")}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--muted-foreground)]">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {invites.length === 0 && (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          {t("noInvites")}
        </div>
      )}
    </div>
  );
}
