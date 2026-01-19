import { createClient } from "@/lib/supabase/server";

export type OrgRole = "owner" | "admin" | "teacher" | "student";
export type AccountType = "student" | "trainer" | "admin";

/**
 * Get the current user's account type
 */
export async function getUserAccountType(): Promise<AccountType | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  return (profile?.account_type as AccountType) || "student";
}

/**
 * Check if user can access trainer/org features based on account type
 */
export async function canAccessTrainerFeatures(): Promise<boolean> {
  const accountType = await getUserAccountType();
  return accountType === "trainer" || accountType === "admin";
}

export interface OrgMembership {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
  memberId: string;
  classId: string | null;
  className: string | null;
}

/**
 * Get the current user's organization membership
 */
export async function getUserOrgMembership(): Promise<OrgMembership | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[getUserOrgMembership] No user found");
    return null;
  }

  console.log("[getUserOrgMembership] User ID:", user.id);

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select(`
      id,
      role,
      class_id,
      class_name,
      organization:organizations (
        id,
        name
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  console.log("[getUserOrgMembership] Query result:", { memberships, error });

  if (error) {
    console.log("[getUserOrgMembership] Query error:", error);
    return null;
  }

  if (!memberships || memberships.length === 0) {
    console.log("[getUserOrgMembership] No memberships found");
    return null;
  }

  const membership = memberships[0];
  console.log("[getUserOrgMembership] Membership:", membership);

  const org = membership.organization as unknown as { id: string; name: string } | null;
  if (!org) {
    console.log("[getUserOrgMembership] Organization is null in join");
    return null;
  }

  return {
    organizationId: org.id,
    organizationName: org.name,
    role: membership.role as OrgRole,
    memberId: membership.id,
    classId: membership.class_id,
    className: membership.class_name,
  };
}

/**
 * Check if user is a trainer (teacher or admin) in their organization
 */
export async function isTrainer(): Promise<boolean> {
  const membership = await getUserOrgMembership();
  if (!membership) return false;
  return ["owner", "admin", "teacher"].includes(membership.role);
}

/**
 * Check if user is an admin in their organization
 */
export async function isOrgAdmin(): Promise<boolean> {
  const membership = await getUserOrgMembership();
  if (!membership) return false;
  return ["owner", "admin"].includes(membership.role);
}

/**
 * Get user's organization membership with role check
 * Returns null if user doesn't have the required role
 */
export async function requireOrgRole(
  requiredRoles: OrgRole[]
): Promise<OrgMembership | null> {
  const membership = await getUserOrgMembership();
  if (!membership) return null;
  if (!requiredRoles.includes(membership.role)) return null;
  return membership;
}

/**
 * Check if user can manage a specific class
 */
export async function canManageClass(classId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check if user is a trainer in the class's organization
  const { data: classData } = await supabase
    .from("organization_classes")
    .select("organization_id")
    .eq("id", classId)
    .single();

  if (!classData) return false;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", classData.organization_id)
    .eq("status", "active")
    .single();

  if (!membership) return false;

  return ["owner", "admin", "teacher"].includes(membership.role);
}

export interface ClassRestrictions {
  hasClass: boolean;
  classId: string | null;
  className: string | null;
  allowedModels: string[] | null; // null means all models allowed
  orgAllowedModels: string[] | null; // org-level restrictions
}

/**
 * Get model restrictions for a user based on their class membership
 * Most restrictive wins: global → org → class
 */
export async function getClassModelRestrictions(userId: string): Promise<ClassRestrictions> {
  const supabase = await createClient();

  // Get user's membership with class info
  const { data: membership } = await supabase
    .from("organization_members")
    .select(`
      id,
      class_id,
      class_name,
      organization:organizations (
        id,
        settings
      )
    `)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!membership) {
    return {
      hasClass: false,
      classId: null,
      className: null,
      allowedModels: null,
      orgAllowedModels: null,
    };
  }

  const org = membership.organization as unknown as { id: string; settings: Record<string, unknown> | null } | null;
  const orgAllowedModels = org?.settings?.allowed_models as string[] | null ?? null;

  // If no class assignment, return org restrictions only
  if (!membership.class_id) {
    return {
      hasClass: false,
      classId: null,
      className: null,
      allowedModels: orgAllowedModels,
      orgAllowedModels,
    };
  }

  // Get class settings
  const { data: classData } = await supabase
    .from("organization_classes")
    .select("id, name, settings")
    .eq("id", membership.class_id)
    .single();

  if (!classData) {
    return {
      hasClass: false,
      classId: null,
      className: null,
      allowedModels: orgAllowedModels,
      orgAllowedModels,
    };
  }

  const classSettings = classData.settings as { allowed_models?: string[] | null } | null;
  const classAllowedModels = classSettings?.allowed_models ?? null;

  // Compute most restrictive: intersection of org and class allowed models
  let finalAllowedModels: string[] | null = null;

  if (orgAllowedModels !== null && classAllowedModels !== null) {
    // Intersection of both
    finalAllowedModels = classAllowedModels.filter(m => orgAllowedModels.includes(m));
  } else if (classAllowedModels !== null) {
    finalAllowedModels = classAllowedModels;
  } else if (orgAllowedModels !== null) {
    finalAllowedModels = orgAllowedModels;
  }

  return {
    hasClass: true,
    classId: classData.id,
    className: classData.name,
    allowedModels: finalAllowedModels,
    orgAllowedModels,
  };
}

/**
 * Check if a specific model is allowed for a user
 */
export async function isModelAllowedForUser(userId: string, modelId: string): Promise<boolean> {
  const restrictions = await getClassModelRestrictions(userId);

  // No restrictions means all models allowed
  if (restrictions.allowedModels === null) {
    return true;
  }

  return restrictions.allowedModels.includes(modelId);
}
