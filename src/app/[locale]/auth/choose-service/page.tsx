import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import ServiceChooser from "@/components/auth/service-chooser";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ intent?: string }>;
};

export default async function ChooseServicePage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { intent } = await searchParams;

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
    redirect(
      `/${locale}/auth/accept-terms?redirect=/auth/choose-service${intent ? `?intent=${encodeURIComponent(intent)}` : ""}`
    );
  }

  // Check for pending family invites
  const { data: pendingInvite } = await supabase
    .from("organization_invites")
    .select("token, organization:organizations!inner(type)")
    .eq("email", user.email!)
    .eq("status", "pending")
    .eq("organizations.type", "family")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (pendingInvite) {
    redirect(`/${locale}/mifa/join/${pendingInvite.token}`);
  }

  // Check for family child membership
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (memberships) {
    for (const m of memberships) {
      const org = m.organizations as unknown as { type: string } | null;
      if (!org) continue;

      if (org.type === "family" && m.role !== "owner" && m.role !== "admin") {
        redirect(`/${locale}/mifa/chat`);
      }
    }

    // If user has any active org membership, they don't need service selection
    if (memberships.length > 0) {
      redirect(`/${locale}/auth/choose-workspace`);
    }
  }

  return <ServiceChooser intent={intent} />;
}
