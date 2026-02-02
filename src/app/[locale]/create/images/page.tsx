import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ImageStudioClient } from "./image-studio-client";
import { getUserCredits, getEffectiveBalance } from "@/lib/credits";

interface ImageStudioPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ImageStudioPage({ params }: ImageStudioPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

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
    redirect(`/${locale}/auth/accept-terms`);
  }

  // Fetch data in parallel
  const [credits, modelsResult, generationsResult, markupResult] =
    await Promise.all([
      getUserCredits(user.id),
      supabase
        .from("image_models")
        .select("*")
        .eq("is_active", true)
        .order("is_recommended", { ascending: false })
        .order("name"),
      supabase
        .from("image_generations")
        .select(
          `
        *,
        model:image_models(id, name, provider)
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

  // For students in orgs, use personal balance only (image gen uses personal credits)
  const isTrainer = credits.isTrainer === true;
  const isInOrg = !!credits.orgId;
  const isStudent = isInOrg && !isTrainer;

  // Students use personal balance for image generation
  const effectiveBalance = isStudent
    ? (credits.personalBalance ?? 0)
    : getEffectiveBalance(credits);
  const markupPercentage = markupResult.data?.value?.percentage || 50;

  return (
    <ImageStudioClient
      initialBalance={effectiveBalance}
      initialModels={modelsResult.data || []}
      initialGenerations={generationsResult.data || []}
      markupPercentage={markupPercentage}
      isStudent={isStudent}
      className={credits.className}
    />
  );
}
