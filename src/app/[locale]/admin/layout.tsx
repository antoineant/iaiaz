"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Bot,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  is_admin: boolean;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/models", label: "Modèles", icon: Bot },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/admin");
        return;
      }

      // First try to get profile with is_admin column
      let { data: profileData, error } = await supabase
        .from("profiles")
        .select("id, email, is_admin")
        .eq("id", user.id)
        .single();

      // Debug: log what we got
      console.log("Admin check - Profile data:", profileData, "Error:", error, "Error code:", error?.code);

      // If error (possibly is_admin column doesn't exist), try without is_admin
      if (error) {
        console.log("Trying query without is_admin column...");
        const { data: basicProfile, error: basicError } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("id", user.id)
          .single();

        if (basicError) {
          console.error("Cannot fetch profile at all:", basicError);
          router.push("/chat");
          return;
        }

        // Profile exists but is_admin column doesn't - migration not run
        console.log("Migration 002_admin_features.sql needs to be run!");
        alert("La migration admin n'a pas été exécutée.\n\nVeuillez exécuter le fichier:\nsupabase/migrations/002_admin_features.sql\n\ndans l'éditeur SQL de Supabase.");
        router.push("/chat");
        return;
      }

      if (!profileData?.is_admin) {
        console.log("User is not admin (is_admin =", profileData?.is_admin, "), redirecting to /chat");
        router.push("/chat");
        return;
      }

      setProfile(profileData);
      setIsLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--muted)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--background)] border-r border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm">
            <ChevronLeft className="w-4 h-4" />
            Retour au site
          </Link>
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400 mt-2">
            iaiaz Admin
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            {profile?.email}
          </p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-medium"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
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
            Déconnexion
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
