import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { VideoStudioClient } from "./video-studio-client";
import { getUserCredits, getEffectiveBalance } from "@/lib/credits";

export default async function VideoStudioPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has accepted terms
  const { data: termsCheck } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("id", user.id)
    .single();

  if (!termsCheck?.terms_accepted_at) {
    redirect("/auth/accept-terms");
  }

  // Fetch data in parallel
  const [credits, modelsResult, generationsResult, markupResult] =
    await Promise.all([
      getUserCredits(user.id),
      supabase
        .from("video_models")
        .select("*")
        .eq("is_active", true)
        .order("is_recommended", { ascending: false })
        .order("display_order"),
      supabase
        .from("video_generations")
        .select(
          `
        *,
        model:video_models(id, name, provider)
      `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      adminClient
        .from("app_settings")
        .select("value")
        .eq("key", "markup")
        .single(),
    ]);

  // For students in orgs, use personal balance only (video gen uses personal credits)
  const isTrainer = credits.isTrainer === true;
  const isInOrg = !!credits.orgId;
  const isStudent = isInOrg && !isTrainer;

  // Students use personal balance for video generation
  const effectiveBalance = isStudent
    ? (credits.personalBalance ?? 0)
    : getEffectiveBalance(credits);
  const markupPercentage = markupResult.data?.value?.percentage || 50;

  return (
    <VideoStudioClient
      initialBalance={effectiveBalance}
      initialModels={modelsResult.data || []}
      initialGenerations={generationsResult.data || []}
      markupPercentage={markupPercentage}
      isStudent={isStudent}
      className={credits.className}
    />
  );
}
