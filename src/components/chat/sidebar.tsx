"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PrivacyInfoModal } from "./privacy-info-modal";
import { SupervisionInfoModal } from "@/components/familia/supervision-info-modal";
import { ChildSettingsPanel } from "@/components/familia/child-settings-panel";
import type { Conversation } from "@/types";
import { getThemeColor } from "@/lib/familia/theme";
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
  Video,
  User,
  Users,
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

interface FamiliaSidebarMode {
  accentColor: string | null;
  userName: string;
  supervisionMode: string;
  dailyCreditLimit?: number | null;
  dailyCreditsUsed?: number;
  cumulativeCredits?: boolean;
  weeklyCreditsUsed?: number;
  creditsAllocated?: number;
}

interface FamiliaParentMode {
  orgId: string;
  orgName: string;
}

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  balance: number;
  personalBalance?: number;
  isTrainer?: boolean;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  orgContext?: OrgContext;
  userInfo?: UserInfo;
  classes?: StudentClass[];
  managedClasses?: ManagedClass[];
  familiaMode?: FamiliaSidebarMode;
  onAccentColorChange?: (color: string) => void;
  familiaParentMode?: FamiliaParentMode;
}

export function Sidebar({
  conversations,
  currentConversationId,
  balance,
  personalBalance,
  isTrainer,
  onNewConversation,
  onDeleteConversation,
  orgContext,
  userInfo,
  classes,
  managedClasses,
  familiaMode,
  onAccentColorChange,
  familiaParentMode,
}: SidebarProps) {
  const router = useRouter();
  const t = useTranslations("chat.sidebar");
  const tSupervision = useTranslations("familia.chat.supervisionInfo");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSupervisionInfo, setShowSupervisionInfo] = useState(false);
  const [showPreciseBalance, setShowPreciseBalance] = useState(false);
  const [teenAccentColor, setTeenAccentColor] = useState(familiaMode?.accentColor || null);
  const [showChildSettings, setShowChildSettings] = useState(false);

  const isOrgMember = !!orgContext;
  const canManageOrg = orgContext && ["owner", "admin", "teacher"].includes(orgContext.role);

  // Familia teen theme
  const teenTheme = familiaMode ? getThemeColor(teenAccentColor || "blue") : null;

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

  // ──────────────────────────────────────────────
  // Gen Z teen sidebar (familia mode)
  // ──────────────────────────────────────────────
  const teenSidebarContent = familiaMode ? (
    <>
      {/* Header — gradient accent bar with name */}
      <div
        className="p-4 border-b border-white/10"
        style={{
          background: `linear-gradient(135deg, ${teenTheme?.hex || "#3B82F6"}20, transparent)`,
        }}
      >
        <Link href="/" className="text-xl font-extrabold tracking-tight" style={{ color: teenTheme?.hex || "#3B82F6" }}>
          iaiaz
        </Link>
        <p className="text-sm mt-1 text-[var(--muted-foreground)]">
          {t("teenGreeting", { name: familiaMode.userName })}
        </p>
      </div>

      {/* Credit ring — visual, playful */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-4">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="transform -rotate-90 w-14 h-14" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-[var(--border)]" />
            <circle
              cx="28" cy="28" r="22"
              strokeWidth="2.5" fill="none"
              strokeLinecap="round"
              style={{
                stroke: teenTheme?.hex || "#3B82F6",
                strokeDasharray: `${(() => {
                  // Use tracked allocated credits, or estimate if not available
                  const totalAllocated = familiaMode.creditsAllocated || Math.ceil(Math.max(balance, 1) / 5) * 5;
                  const percentage = totalAllocated > 0 ? balance / totalAllocated : 0;
                  return percentage * 138;
                })()} 138`,
                filter: `drop-shadow(0 0 4px ${teenTheme?.hex || "#3B82F6"}50)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              onClick={() => setShowPreciseBalance(!showPreciseBalance)}
              className={cn(
                "font-bold leading-none cursor-pointer transition-all hover:opacity-70 hover:scale-105 active:scale-95",
                showPreciseBalance ? "text-[9px]" : "text-[11px]"
              )}
              title={showPreciseBalance ? "Cliquez pour simplifier" : "Cliquez pour plus de précision"}
            >
              {showPreciseBalance ? balance.toFixed(4) : balance.toFixed(2)}€
            </span>
          </div>
        </div>
      </div>

      {/* Credit limit indicator */}
      {familiaMode.dailyCreditLimit && (() => {
        const isCumulative = familiaMode.cumulativeCredits;
        const used = isCumulative ? (familiaMode.weeklyCreditsUsed || 0) : (familiaMode.dailyCreditsUsed || 0);
        const limit = isCumulative ? familiaMode.dailyCreditLimit * 7 : familiaMode.dailyCreditLimit;
        const ratio = used / limit;
        return (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] mb-1">
              <span>{isCumulative ? t("teenWeeklyLimit") : t("teenDailyLimit")}</span>
              <span>
                {used.toFixed(2)}€ / {limit.toFixed(2)}€
              </span>
            </div>
            <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ratio * 100)}%`,
                  background: ratio > 0.8
                    ? "linear-gradient(90deg, #F97316, #DC2626)"
                    : `linear-gradient(90deg, ${teenTheme?.hex || "#3B82F6"}, ${teenTheme?.dark || "#1E3A5F"})`,
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* Low credit warning - Ask for more credits */}
      {balance < 0.5 && (
        <div className="px-4 pb-3">
          <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30">
            <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
              {t("teenLowCreditWarning")}
            </p>
            <button
              onClick={() => {
                // Copy a friendly message to clipboard
                const message = `Salut ! J'ai bientôt plus de crédits sur iaiaz. Tu peux m'en ajouter ? Merci ! 😊`;
                navigator.clipboard.writeText(message);
                alert("Message copié ! Tu peux le coller et l'envoyer à tes parents.");
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
            >
              <span>💬</span>
              {t("teenAskForCredits")}
            </button>
          </div>
        </div>
      )}

      {/* New chat button */}
      <div className="p-4">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
          style={{
            background: `linear-gradient(135deg, ${teenTheme?.hex || "#3B82F6"}, ${teenTheme?.dark || "#1E3A5F"})`,
          }}
        >
          <Plus className="w-4 h-4" />
          {t("teenNewChat")}
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-semibold text-[var(--muted-foreground)] px-2 py-2">
          {t("personalConversations")}
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
                    "flex items-center gap-2 px-2 py-2 rounded-xl text-sm transition-all group",
                    currentConversationId === conv.id
                      ? "font-medium"
                      : "hover:bg-[var(--muted)]"
                  )}
                  style={currentConversationId === conv.id ? {
                    backgroundColor: `${teenTheme?.hex || "#3B82F6"}15`,
                    color: teenTheme?.hex || "#3B82F6",
                  } : undefined}
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

      {/* Teen footer — theme picker, supervision badge, logout */}
      <div className="p-3 border-t border-[var(--border)] space-y-2">
        {/* Mon espace button */}
        <div className="px-1">
          <button
            onClick={() => setShowChildSettings(true)}
            className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors w-full py-1"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t("teenMySpace")}</span>
          </button>
        </div>

        {/* Supervision mode badge — clickable for transparency info */}
        <div className="px-1">
          <button
            onClick={() => setShowSupervisionInfo(true)}
            className={cn(
              "inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium transition-all hover:scale-105 cursor-pointer",
              familiaMode.supervisionMode === "guided"
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/40"
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/40"
            )}
          >
            <Shield className="w-3 h-3" />
            {familiaMode.supervisionMode === "guided" ? t("teenGuided") : t("teenTrusted")}
          </button>
        </div>

        {/* Friendly logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors text-left"
        >
          <span className="text-base">👋</span>
          {t("teenLogout")}
        </button>
      </div>

      {/* Supervision Transparency Modal */}
      <SupervisionInfoModal
        open={showSupervisionInfo}
        onClose={() => setShowSupervisionInfo(false)}
        mode={familiaMode.supervisionMode as "guided" | "trusted" | "adult"}
        translations={{
          title: familiaMode.supervisionMode === "guided" ? tSupervision("guidedTitle") : tSupervision("trustedTitle"),
          whatParentsSee: tSupervision("whatParentsSee"),
          whatParentsDontSee: tSupervision("whatParentsDontSee"),
          canSee: [
            tSupervision("canSee.0"),
            tSupervision("canSee.1"),
            tSupervision("canSee.2"),
            tSupervision("canSee.3"),
          ],
          cannotSee: [
            tSupervision("cannotSee.0"),
            tSupervision("cannotSee.1"),
            tSupervision("cannotSee.2"),
            tSupervision("cannotSee.3"),
          ],
          why: familiaMode.supervisionMode === "guided" ? tSupervision("guidedWhy") : tSupervision("trustedWhy"),
        }}
      />

      {/* Child Settings Panel */}
      <ChildSettingsPanel
        open={showChildSettings}
        onClose={() => setShowChildSettings(false)}
        accentColor={teenAccentColor}
        onAccentColorChange={(color) => {
          setTeenAccentColor(color);
          onAccentColorChange?.(color);
        }}
        teenTheme={teenTheme || undefined}
      />
    </>
  ) : null;

  // ──────────────────────────────────────────────
  // Family parent sidebar
  // ──────────────────────────────────────────────
  const parentSidebarContent = familiaParentMode ? (
    <>
      {/* Header — family branding */}
      <div className="p-4 border-b border-[var(--border)]">
        <Link href="/" className="text-2xl font-bold text-violet-600 dark:text-violet-400">
          iaiaz
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <Users className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium truncate">{familiaParentMode.orgName}</span>
        </div>
        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">
          {t("familiaParentBadge")}
        </span>
      </div>

      {/* Family Credits */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--muted-foreground)]">{t("familyCredits")}</span>
          <span className="font-semibold">{formatCurrency(balance)}</span>
        </div>
      </div>

      {/* New conversation */}
      <div className="p-4">
        <Button className="w-full" onClick={onNewConversation}>
          <Plus className="w-4 h-4 mr-2" />
          {t("newConversation")}
        </Button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-semibold text-[var(--muted-foreground)] px-2 py-2">
          {t("personalConversations")}
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
                      ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
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

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] space-y-1">
        <NextLink
          href={`/${locale}/familia/dashboard`}
          className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors text-violet-600 dark:text-violet-400 font-medium"
          onClick={() => setIsOpen(false)}
        >
          <Users className="w-4 h-4" />
          {t("backToFamiliaDashboard")}
        </NextLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          {t("logout")}
        </button>
      </div>
    </>
  ) : null;

  // ──────────────────────────────────────────────
  // Standard adult sidebar
  // ──────────────────────────────────────────────
  const sidebarContent = familiaMode ? teenSidebarContent : familiaParentMode ? parentSidebarContent : (
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
            {/* Credit display - different for trainers vs students */}
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">
                  {isTrainer ? t("trainerOrgCredits") : t("classCredits")}
                </span>
                <span className="font-semibold">{formatCurrency(balance)}</span>
              </div>
              {/* Only show personal balance for students */}
              {!isTrainer && personalBalance !== undefined && (
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
            {canManageOrg && !familiaMode && (
              <NextLink href={`/${locale}/org`}>
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
      <div className="p-4">
        <Button className="w-full" onClick={onNewConversation}>
          <Plus className="w-4 h-4 mr-2" />
          {t("newConversation")}
        </Button>
        {!familiaMode && (
          <>
            <NextLink href={`/${locale}/create/images`} onClick={() => setIsOpen(false)} className="block mt-4">
              <Button variant="ghost" size="sm" className="w-full text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <ImageIcon className="w-4 h-4 mr-2" />
                {t("imageStudio")}
              </Button>
            </NextLink>
            <NextLink href={`/${locale}/create/videos`} onClick={() => setIsOpen(false)} className="block mt-2">
              <Button variant="ghost" size="sm" className="w-full text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <Video className="w-4 h-4 mr-2" />
                {t("videoStudio")}
              </Button>
            </NextLink>
          </>
        )}
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-semibold text-[var(--muted-foreground)] px-2 py-2">
          {t("personalConversations")}
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

      {/* Classes section - hidden for familia teens */}
      {!familiaMode && (
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
                      href={`/${locale}/org/classes/${cls.id}`}
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
                href={`/${locale}/org/classes`}
                className="flex items-center justify-center gap-1 px-2 py-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                {t("viewAllClasses")}
                <ChevronRight className="w-3 h-3" />
              </NextLink>
            </>
          ) : (
            <NextLink
              href={`/${locale}/org/classes`}
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <GraduationCap className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{t("noManagedClasses")}</span>
              <ChevronRight className="w-4 h-4" />
            </NextLink>
          )
        ) : (
          // Student view: show enrolled classes with link to class chat
          classes && classes.length > 0 ? (
            <>
              <ul className="space-y-1">
                {classes.slice(0, 3).map((cls) => (
                  <li key={cls.class_id}>
                    <NextLink
                      href={cls.is_accessible
                        ? `/${locale}/class/${cls.class_id}/chat`
                        : `/${locale}/class/${cls.class_id}`
                      }
                      className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        cls.is_accessible ? "bg-green-500" : "bg-gray-400"
                      )} />
                      <GraduationCap className="w-4 h-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                      <span className="flex-1 truncate">{cls.class_name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {formatCurrency(cls.credits_remaining)}
                      </span>
                    </NextLink>
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
      )}

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <User className="w-4 h-4" />
          {t("myAccount")}
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
