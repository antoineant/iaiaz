import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import WorkspaceChooser from "@/components/auth/workspace-chooser";

export type Workspace = {
  id: string;
  type: "study" | "business" | "mifa";
  name: string;
  orgId?: string;
  role?: string;
  href: string;
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ChooseWorkspacePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Check if user has accepted terms
  const { data: termsCheck } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("id", user.id)
    .single();

  if (!termsCheck?.terms_accepted_at) {
    redirect(`/${locale}/auth/accept-terms?redirect=/auth/choose-workspace`);
  }

  // Read intent cookie (set by GoogleButton or callback)
  const cookieStore = await cookies();
  const intentCookie = cookieStore.get("auth_redirect_after")?.value;
  const intent = intentCookie ? decodeURIComponent(intentCookie) : null;

  // Auto-redirect for specific intents (not generic /chat)
  if (intent && intent !== "/chat") {
    redirect(`/${locale}${intent}`);
  }

  // Fetch all org memberships
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, type)")
    .eq("user_id", user.id);

  // Build workspace list
  const workspaces: Workspace[] = [];

  // Always add Study
  workspaces.push({
    id: "study",
    type: "study",
    name: "Study by iaiaz",
    href: "/chat",
  });

  if (memberships) {
    for (const m of memberships) {
      const org = m.organizations as unknown as {
        id: string;
        name: string;
        type: string;
      } | null;
      if (!org) continue;

      if (org.type === "family") {
        if (m.role === "owner" || m.role === "admin") {
          workspaces.push({
            id: `mifa-${org.id}`,
            type: "mifa",
            name: org.name,
            orgId: org.id,
            role: m.role,
            href: "/mifa/dashboard",
          });
        }
      } else if (
        m.role === "owner" ||
        m.role === "admin" ||
        m.role === "teacher"
      ) {
        // Business/training_center/individual org — only for admin roles
        workspaces.push({
          id: `business-${org.id}`,
          type: "business",
          name: org.name,
          orgId: org.id,
          role: m.role,
          href: "/org",
        });
      }
    }
  }

  // Auto-redirect if only Study (no other workspaces)
  if (workspaces.length === 1) {
    if (intent) {
      redirect(`/${locale}${intent}`);
    }
    redirect(`/${locale}/chat`);
  }

  return <WorkspaceChooser workspaces={workspaces} locale={locale} />;
}
