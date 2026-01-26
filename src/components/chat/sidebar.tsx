"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PrivacyInfoModal } from "./privacy-info-modal";
import type { Conversation } from "@/types";
import {
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  CreditCard,
  Menu,
  X,
  Trash2,
  Building2,
  ChevronRight,
  GraduationCap,
  Shield,
  Info,
  Image as ImageIcon,
} from "lucide-react";

interface OrgContext {
  orgName: string;
  role: string;
  limits?: {
    daily?: { remaining: number; limit: number };
    weekly?: { remaining: number; limit: number };
    monthly?: { remaining: number; limit: number };
  };
}

interface UserInfo {
  displayName?: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface StudentClass {
  class_id: string;
  class_name: string;
  organization_name: string;
  is_accessible: boolean;
  credits_remaining: number;
}

interface ManagedClass {
  id: string;
  name: string;
  status: string;
  is_active: boolean;
  student_count: number;
}

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  balance: number;
  personalBalance?: number;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  orgContext?: OrgContext;
  userInfo?: UserInfo;
  classes?: StudentClass[];
  managedClasses?: ManagedClass[];
}

export function Sidebar({
  conversations,
  currentConversationId,
  balance,
  personalBalance,
  onNewConversation,
  onDeleteConversation,
  orgContext,
  userInfo,
  classes,
  managedClasses,
}: SidebarProps) {
  const router = useRouter();
  const t = useTranslations("chat.sidebar");
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const isOrgMember = !!orgContext;
  const canManageOrg = orgContext && ["owner", "admin", "teacher"].includes(orgContext.role);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(id);
    await onDeleteConversation(id);
    setDeletingId(null);
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <Link href="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400">
          iaiaz
        </Link>
      </div>

      {/* Balance */}
      <div className="p-4 border-b border-[var(--border)]">
        {isOrgMember ? (
          <>
            {/* Organization context */}
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium truncate">{orgContext?.orgName}</span>
            </div>
            {/* Both balances */}
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">{t("orgCredits")}</span>
                <span className="font-semibold">{formatCurrency(balance)}</span>
              </div>
              {personalBalance !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted-foreground)]">{t("personalCredits")}</span>
                  <span className="font-medium text-[var(--muted-foreground)]">{formatCurrency(personalBalance)}</span>
                </div>
              )}
            </div>
            {/* Show limits if any */}
            {orgContext?.limits?.daily && (
              <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                <div className="flex justify-between">
                  <span>{t("dailyLimit")}</span>
                  <span>{formatCurrency(orgContext.limits.daily.remaining)} / {formatCurrency(orgContext.limits.daily.limit)}</span>
                </div>
              </div>
            )}
            {canManageOrg && (
              <NextLink href="/org">
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <Settings className="w-4 h-4 mr-2" />
                  {t("manageOrg")}
                </Button>
              </NextLink>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">{t("balance")}</span>
              <span className="font-semibold">{formatCurrency(balance)}</span>
            </div>
            <Link href="/dashboard/credits">
              <Button variant="outline" size="sm" className="w-full mt-2">
                <CreditCard className="w-4 h-4 mr-2" />
                {t("recharge")}
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Privacy badge */}
      <div className="px-3 pb-2">
        <button
          onClick={() => setShowPrivacyModal(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <Shield className="w-4 h-4" />
          <span className="flex-1 text-left">{t("privateConversations")}</span>
          <Info className="w-3 h-3 opacity-60" />
        </button>
      </div>

      {/* New conversation */}
      <div className="p-4 space-y-2">
        <Button className="w-full" onClick={onNewConversation}>
          <Plus className="w-4 h-4 mr-2" />
          {t("newConversation")}
        </Button>
        <NextLink href="/create/images" onClick={() => setIsOpen(false)}>
          <Button variant="outline" className="w-full">
            <ImageIcon className="w-4 h-4 mr-2" />
            {t("imageStudio")}
          </Button>
        </NextLink>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-semibold text-[var(--muted-foreground)] px-2 py-2">
          {t("recentConversations")}
        </div>
        {conversations.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] px-2 py-4 text-center">
            {t("noConversations")}
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <Link
                  href={{ pathname: "/chat/[id]", params: { id: conv.id } }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors group",
                    currentConversationId === conv.id
                      ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                      : "hover:bg-[var(--muted)]"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">
                    {conv.title || t("newConversation")}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className={cn(
                      "p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all",
                      deletingId === conv.id && "opacity-100"
                    )}
                    disabled={deletingId === conv.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Classes section */}
      <div className="px-2 py-2 border-t border-[var(--border)]">
        <div className="text-xs font-semibold text-[var(--muted-foreground)] px-2 py-2">
          {canManageOrg ? t("managedClasses") : t("classes")}
        </div>
        {canManageOrg ? (
          // Trainer view: show managed classes
          managedClasses && managedClasses.length > 0 ? (
            <>
              <ul className="space-y-1">
                {managedClasses.slice(0, 3).map((cls) => (
                  <li key={cls.id}>
                    <NextLink
                      href={`/org/classes/${cls.id}`}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        cls.is_active ? "bg-green-500" : "bg-gray-400"
                      )} />
                      <GraduationCap className="w-4 h-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                      <span className="flex-1 truncate">{cls.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">{cls.student_count}</span>
                    </NextLink>
                  </li>
                ))}
              </ul>
              <NextLink
                href="/org/classes"
                className="flex items-center justify-center gap-1 px-2 py-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                {t("viewAllClasses")}
                <ChevronRight className="w-3 h-3" />
              </NextLink>
            </>
          ) : (
            <NextLink
              href="/org/classes"
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <GraduationCap className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{t("noManagedClasses")}</span>
              <ChevronRight className="w-4 h-4" />
            </NextLink>
          )
        ) : (
          // Student view: show enrolled classes
          classes && classes.length > 0 ? (
            <>
              <ul className="space-y-1">
                {classes.slice(0, 3).map((cls) => (
                  <li key={cls.class_id}>
                    <Link
                      href={{ pathname: "/class/[classId]", params: { classId: cls.class_id } }}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        cls.is_accessible ? "bg-green-500" : "bg-gray-400"
                      )} />
                      <GraduationCap className="w-4 h-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                      <span className="flex-1 truncate">{cls.class_name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/classes"
                className="flex items-center justify-center gap-1 px-2 py-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                {t("viewAllClasses")}
                <ChevronRight className="w-3 h-3" />
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard/classes"
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <GraduationCap className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{t("noClasses")}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <Settings className="w-4 h-4" />
          {t("dashboard")}
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          {t("logout")}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] shadow-sm"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[var(--background)] border-r border-[var(--border)] flex flex-col",
          "transform transition-transform lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Privacy info modal */}
      <PrivacyInfoModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </>
  );
}
