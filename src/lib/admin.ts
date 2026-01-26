import { createClient } from "@/lib/supabase/server";

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, account_type")
    .eq("id", user.id)
    .single();

  // Check both is_admin flag and account_type for compatibility
  return profile?.is_admin === true || profile?.account_type === "admin";
}

export async function requireAdmin() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error("Unauthorized: Admin access required");
  }
}

export async function getAdminUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getCurrentAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
