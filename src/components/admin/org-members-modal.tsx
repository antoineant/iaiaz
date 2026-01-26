"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  Loader2,
  Users,
  Shield,
  ShieldCheck,
  ShieldOff,
  User,
  GraduationCap,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: string;
  can_manage_credits: boolean;
  credit_allocated: number;
  credit_used: number;
  status: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

interface OrgMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="w-4 h-4 text-yellow-500" />,
  admin: <ShieldCheck className="w-4 h-4 text-blue-500" />,
  teacher: <User className="w-4 h-4 text-green-500" />,
  student: <GraduationCap className="w-4 h-4 text-purple-500" />,
};

const roleLabels: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Admin",
  teacher: "Formateur",
  student: "Étudiant",
};

export function OrgMembersModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
}: OrgMembersModalProps) {
  const t = useTranslations("admin.organizations");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && organizationId) {
      loadMembers();
    }
  }, [isOpen, organizationId]);

  const loadMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationId}/members`
      );
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
        setMembers(data.members || []);
      } else {
        setError("Erreur lors du chargement des membres");
      }
    } catch {
      setError("Erreur lors du chargement des membres");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePermission = async (
    memberId: string,
    currentValue: boolean
  ) => {
    setUpdatingMember(memberId);
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationId}/members`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: memberId,
            can_manage_credits: !currentValue,
          }),
        }
      );

      if (response.ok) {
        // Update local state
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, can_manage_credits: !currentValue } : m
          )
        );
      } else {
        const data = await response.json();
        setError(data.error || "Erreur lors de la mise à jour");
      }
    } catch {
      setError("Erreur lors de la mise à jour");
    } finally {
      setUpdatingMember(null);
    }
  };

  if (!isOpen) return null;

  // Filter to show only teachers (owners/admins always have permission)
  const manageableMembers = members.filter(
    (m) => m.role === "teacher" && m.status === "active"
  );
  const otherMembers = members.filter(
    (m) => m.role !== "teacher" || m.status !== "active"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--background)] rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-[var(--border)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-semibold">{t("manageMembers")}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {organizationName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : (
            <div className="space-y-6">
              {/* Credit Management Permission Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-primary-600" />
                  <h3 className="font-medium">{t("creditPermission")}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("creditPermissionDescription")}
                </p>

                {manageableMembers.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)] italic">
                    {t("noTeachers")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {manageableMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            {roleIcons[member.role]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.email}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {roleLabels[member.role]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {updatingMember === member.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <button
                              onClick={() =>
                                handleTogglePermission(
                                  member.id,
                                  member.can_manage_credits
                                )
                              }
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                member.can_manage_credits
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                              }`}
                            >
                              {member.can_manage_credits ? (
                                <>
                                  <ShieldCheck className="w-4 h-4" />
                                  {t("authorized")}
                                </>
                              ) : (
                                <>
                                  <ShieldOff className="w-4 h-4" />
                                  {t("notAuthorized")}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Other Members (info only) */}
              {otherMembers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-[var(--muted-foreground)]" />
                    <h3 className="font-medium text-[var(--muted-foreground)]">
                      {t("otherMembers")}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {otherMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
                            {roleIcons[member.role]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.email}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {roleLabels[member.role]}
                              {member.status !== "active" && ` (${member.status})`}
                            </p>
                          </div>
                        </div>
                        {(member.role === "owner" || member.role === "admin") && (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {t("alwaysAuthorized")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <Button variant="outline" onClick={onClose} className="w-full">
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
