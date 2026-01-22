"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ChevronLeft,
  LogOut,
  Loader2,
  Building2,
  GraduationCap,
  CreditCard,
  Crown,
  Shield,
  BarChart3,
} from "lucide-react";

interface OrgMembership {
  id: string;
  organization_id: string;
  organization_name: string;
  role: string;
  credit_remaining: number;
  account_type: string;
  subscription_plan_id: string | null;
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("org");
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [membership, setMembership] = useState<OrgMembership | null>(null);

  // Remove locale prefix from pathname for comparison
  const cleanPath = pathname.replace(/^\/(fr|en)/, "");

  useEffect(() => {
    const checkOrgMembership = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/org");
        return;
      }

      // Check if user is org member with admin privileges
      const { data: orgMember, error } = await supabase.rpc(
        "get_user_organization",
        {
          p_user_id: user.id,
        }
      );

      if (error || !orgMember || orgMember.length === 0) {
        // Check if user is a trainer - they should have an org auto-created
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_type")
          .eq("id", user.id)
          .single();

        if (profile?.account_type === "personal") {
          // Personal accounts can't access trainer features
          router.push("/chat");
          return;
        }

        // Trainer/admin without org - something went wrong, redirect to chat
        // The org should have been auto-created by the database trigger
        console.error("Trainer without organization - trigger may have failed");
        router.push("/chat");
        return;
      }

      const member = orgMember[0];

      // Only allow owner, admin, and teacher roles to access org management
      if (!["owner", "admin", "teacher"].includes(member.role)) {
        router.push("/chat");
        return;
      }

      // Get account type from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .single();

      // Get organization subscription plan
      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_plan_id")
        .eq("id", member.organization_id)
        .single();

      setMembership({
        id: member.id,
        organization_id: member.organization_id,
        organization_name: member.organization_name,
        role: member.role,
        credit_remaining: member.credit_remaining,
        account_type: profile?.account_type || "trainer",
        subscription_plan_id: org?.subscription_plan_id || null,
      });
      setIsLoading(false);
    };

    checkOrgMembership();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const isSchool = membership?.account_type === "school";
  const isBusiness = membership?.account_type === "business";
  const hasAnonymisation = membership?.subscription_plan_id === "business-pro";

  const navItems = [
    { href: "/org", label: t("nav.dashboard"), icon: LayoutDashboard },
    // Schools get "Classes", Business gets "Teams", Trainers get "Classes"
    ...(!isBusiness
      ? [{ href: "/org/classes", label: t("nav.classes"), icon: GraduationCap }]
      : [{ href: "/org/teams", label: t("nav.teams"), icon: Users }]),
    // Members and Invites for school AND business accounts
    ...((isSchool || isBusiness)
      ? [
          { href: "/org/members", label: isBusiness ? t("nav.employees") : t("nav.members"), icon: Users },
          { href: "/org/invites", label: t("nav.invites"), icon: UserPlus },
        ]
      : []),
    // Analytics for business accounts
    ...(isBusiness
      ? [{ href: "/org/analytics", label: t("nav.analytics"), icon: BarChart3 }]
      : []),
    // Anonymise app for business-pro subscribers only
    ...(isBusiness && hasAnonymisation
      ? [{ href: "/org/anonymise", label: t("nav.anonymise"), icon: Shield }]
      : []),
    { href: "/org/subscription", label: t("nav.subscription"), icon: Crown },
    { href: "/org/credits", label: t("nav.credits"), icon: CreditCard },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--muted)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--background)] border-r border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("nav.backToChat")}
          </Link>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold truncate">
                {membership?.organization_name}
              </h1>
              <p className="text-xs text-[var(--muted-foreground)] capitalize">
                {t(`roles.${membership?.role}`)}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                cleanPath === item.href ||
                (item.href !== "/org" && cleanPath.startsWith(item.href));
              return (
                <li key={item.href}>
                  <NextLink
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-medium"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NextLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[var(--muted-foreground)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
