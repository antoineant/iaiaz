import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { useAuth } from "../auth";

export type FamilyRole = "parent" | "child" | null;

interface FamilyMembership {
  role: FamilyRole;
  orgId: string | null;
  orgName: string | null;
  displayName: string | null;
  supervisionMode: string | null;
  creditsBalance: number;
  accentColor: string | null;
}

const empty: FamilyMembership = {
  role: null,
  orgId: null,
  orgName: null,
  displayName: null,
  supervisionMode: null,
  creditsBalance: 0,
  accentColor: null,
};

export function useFamilyRole() {
  const { user } = useAuth();

  return useQuery<FamilyMembership>({
    queryKey: ["familyRole", user?.id],
    queryFn: async () => {
      if (!user) return empty;

      // Fetch membership + profile in parallel
      const [membershipResult, profileResult] = await Promise.all([
        supabase
          .from("organization_members")
          .select(`
            role,
            display_name,
            supervision_mode,
            organization_id,
            organizations!inner (
              id,
              name,
              type
            )
          `)
          .eq("user_id", user.id)
          .eq("organizations.type", "family")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("display_name, credits_balance, email, accent_color")
          .eq("id", user.id)
          .single(),
      ]);

      const membership = membershipResult.data;
      const profile = profileResult.data;

      if (!membership) return empty;

      const isParent = membership.role === "owner" || membership.role === "admin";
      const org = membership.organizations as any;

      // Name: org member display_name → profile display_name → email prefix
      const displayName =
        membership.display_name ||
        profile?.display_name ||
        profile?.email?.split("@")[0] ||
        user.email?.split("@")[0] ||
        null;

      return {
        role: isParent ? ("parent" as const) : ("child" as const),
        orgId: org?.id || membership.organization_id,
        orgName: org?.name || null,
        displayName,
        supervisionMode: membership.supervision_mode,
        creditsBalance: Number(profile?.credits_balance || 0),
        accentColor: profile?.accent_color || null,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });
}
