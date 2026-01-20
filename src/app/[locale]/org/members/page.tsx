"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  MoreVertical,
  Loader2,
  UserPlus,
  Edit,
  UserX,
  Trash2,
  X,
  CreditCard,
} from "lucide-react";
import NextLink from "next/link";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: string;
  class_name?: string;
  credit_allocated: number;
  credit_used: number;
  status: string;
  joined_at: string;
}

export default function OrgMembersPage() {
  const t = useTranslations("org.members");
  const tRoles = useTranslations("org.roles");
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [allocatingMember, setAllocatingMember] = useState<Member | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ member: Member; action: "suspend" | "remove" } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Edit form state
  const [editRole, setEditRole] = useState("");
  const [editClassName, setEditClassName] = useState("");

  // Allocate form state
  const [allocateAmount, setAllocateAmount] = useState("");

  const loadMembers = async () => {
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

    // Get all members with their profile info
    const { data: membersData } = await supabase
      .from("organization_members")
      .select(
        `
        id,
        user_id,
        role,
        class_name,
        credit_allocated,
        credit_used,
        status,
        created_at,
        profiles(email)
      `
      )
      .eq("organization_id", organizationId)
      .neq("status", "removed")
      .order("created_at", { ascending: false });

    if (membersData) {
      const formattedMembers = membersData.map((m) => {
        const profile = m.profiles as unknown as { email: string } | null;
        return {
          id: m.id,
          user_id: m.user_id,
          email: profile?.email || "Unknown",
          role: m.role,
          class_name: m.class_name,
          credit_allocated: m.credit_allocated || 0,
          credit_used: m.credit_used || 0,
          status: m.status,
          joined_at: m.created_at,
        };
      });
      setMembers(formattedMembers);
      setFilteredMembers(formattedMembers);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredMembers(
        members.filter(
          (m) =>
            m.email.toLowerCase().includes(query) ||
            m.class_name?.toLowerCase().includes(query) ||
            m.role.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, members]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "admin":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "teacher":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "suspended") {
      return (
        <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
          {t("suspended")}
        </span>
      );
    }
    return null;
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditClassName(member.class_name || "");
    setOpenMenuId(null);
  };

  const handleAllocateMember = (member: Member) => {
    setAllocatingMember(member);
    setAllocateAmount("");
    setOpenMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/org/members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          class_name: editClassName || null,
        }),
      });

      if (response.ok) {
        await loadMembers();
        setEditingMember(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update member");
      }
    } catch {
      alert("Failed to update member");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAllocate = async () => {
    if (!allocatingMember) return;
    const amount = parseFloat(allocateAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(t("invalidAmount"));
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/org/members/${allocatingMember.id}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        await loadMembers();
        setAllocatingMember(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to allocate credits");
      }
    } catch {
      alert("Failed to allocate credits");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setIsUpdating(true);

    try {
      if (confirmAction.action === "suspend") {
        const newStatus = confirmAction.member.status === "suspended" ? "active" : "suspended";
        const response = await fetch(`/api/org/members/${confirmAction.member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const data = await response.json();
          alert(data.error || "Failed to update status");
          return;
        }
      } else if (confirmAction.action === "remove") {
        const response = await fetch(`/api/org/members/${confirmAction.member.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          alert(data.error || "Failed to remove member");
          return;
        }
      }

      await loadMembers();
      setConfirmAction(null);
    } catch {
      alert("Operation failed");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <NextLink href="/org/invites">
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            {t("addMember")}
          </Button>
        </NextLink>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <Input
            type="text"
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Members table */}
      <Card>
        <CardContent className="p-0">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              {t("noMembers")}
            </div>
          ) : (
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
                      {t("allocated")}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("used")}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("remaining")}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {member.email}
                            {getStatusBadge(member.status)}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                            member.role
                          )}`}
                        >
                          {tRoles(member.role)}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--muted-foreground)]">
                        {member.class_name || "-"}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {member.credit_allocated.toFixed(2)}€
                      </td>
                      <td className="p-4 text-right font-mono text-[var(--muted-foreground)]">
                        {member.credit_used.toFixed(2)}€
                      </td>
                      <td className="p-4 text-right font-mono">
                        <span
                          className={
                            member.credit_allocated - member.credit_used <= 0
                              ? "text-red-600 dark:text-red-400"
                              : ""
                          }
                        >
                          {(member.credit_allocated - member.credit_used).toFixed(2)}€
                        </span>
                      </td>
                      <td className="p-4 text-right relative">
                        {member.role !== "owner" && (
                          <div ref={openMenuId === member.id ? menuRef : null}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                              className="p-2 hover:bg-[var(--muted)] rounded-lg"
                            >
                              <MoreVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
                            </button>

                            {openMenuId === member.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg z-10">
                                <button
                                  onClick={() => handleEditMember(member)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--muted)] text-left"
                                >
                                  <Edit className="w-4 h-4" />
                                  {t("editMember")}
                                </button>
                                <button
                                  onClick={() => handleAllocateMember(member)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--muted)] text-left"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  {t("allocateCredits")}
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmAction({ member, action: "suspend" });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--muted)] text-left text-orange-600 dark:text-orange-400"
                                >
                                  <UserX className="w-4 h-4" />
                                  {member.status === "suspended" ? t("reactivate") : t("suspend")}
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmAction({ member, action: "remove" });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--muted)] text-left text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t("remove")}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="mt-4 text-sm text-[var(--muted-foreground)]">
        {filteredMembers.length} {t("members").toLowerCase()}
        {searchQuery && ` (${members.length} total)`}
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--background)] rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t("editMember")}</h2>
              <button onClick={() => setEditingMember(null)} className="p-1 hover:bg-[var(--muted)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">{t("email")}</label>
                <p className="text-[var(--muted-foreground)]">{editingMember.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">{t("role")}</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                >
                  <option value="admin">{tRoles("admin")}</option>
                  <option value="teacher">{tRoles("teacher")}</option>
                  <option value="student">{tRoles("student")}</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">{t("class")}</label>
                <Input
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  placeholder={t("classPlaceholder")}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingMember(null)} className="flex-1">
                  {t("cancel")}
                </Button>
                <Button onClick={handleSaveEdit} disabled={isUpdating} className="flex-1">
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Modal */}
      {allocatingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--background)] rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{t("allocateCredits")}</h2>
              <button onClick={() => setAllocatingMember(null)} className="p-1 hover:bg-[var(--muted)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">{t("email")}</label>
                <p className="text-[var(--muted-foreground)]">{allocatingMember.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">{t("currentAllocation")}</label>
                <p className="font-mono">{allocatingMember.credit_allocated.toFixed(2)}€</p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">{t("amountToAdd")}</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={allocateAmount}
                  onChange={(e) => setAllocateAmount(e.target.value)}
                  placeholder="5.00"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setAllocatingMember(null)} className="flex-1">
                  {t("cancel")}
                </Button>
                <Button onClick={handleSaveAllocate} disabled={isUpdating} className="flex-1">
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t("allocate")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--background)] rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">
              {confirmAction.action === "suspend"
                ? confirmAction.member.status === "suspended"
                  ? t("confirmReactivate")
                  : t("confirmSuspend")
                : t("confirmRemove")}
            </h2>

            <p className="text-[var(--muted-foreground)] mb-6">
              {confirmAction.action === "suspend"
                ? confirmAction.member.status === "suspended"
                  ? t("reactivateDescription", { email: confirmAction.member.email })
                  : t("suspendDescription", { email: confirmAction.member.email })
                : t("removeDescription", { email: confirmAction.member.email })}
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmAction(null)} className="flex-1">
                {t("cancel")}
              </Button>
              <Button
                variant={confirmAction.action === "remove" ? "danger" : "primary"}
                onClick={handleConfirmAction}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t("confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
