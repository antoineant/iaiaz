import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCanSpend, deductCredits, getUserCredits } from "@/lib/credits";

interface VideoModel {
  id: string;
  name: string;
  provider: string;
  price_per_second: number;
  price_per_second_premium: number | null;
  resolutions: string[];
  max_duration_seconds: number;
  default_duration_seconds: number;
  supports_audio: boolean;
  supports_reference_image: boolean;
  supports_reference_video: boolean;
  max_prompt_length: number;
  is_active: boolean;
}

// POST /api/create/videos - Generate a video
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Parse request body
    const contentType = request.headers.get("content-type") || "";

    let modelId: string;
    let prompt: string;
    let duration = 5;
    let resolution = "720p";
    let quality = "standard";
    let referenceImageUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      modelId = formData.get("model") as string;
      prompt = formData.get("prompt") as string;
      duration = parseInt(formData.get("duration") as string) || 5;
      resolution = (formData.get("resolution") as string) || "720p";
      quality = (formData.get("quality") as string) || "standard";

      const referenceImage = formData.get("referenceImage") as File | null;

      if (referenceImage && referenceImage.size > 0) {
        // Upload reference image to Supabase storage
        const fileName = `${user.id}/${Date.now()}_ref.png`;
        const { data: uploadData, error: uploadError } = await adminClient.storage
          .from("video-references")
          .upload(fileName, referenceImage, {
            contentType: referenceImage.type,
            upsert: true,
          });

        if (uploadError) {
          console.error("Error uploading reference image:", uploadError);
          return NextResponse.json(
            { error: "Erreur lors de l'upload de l'image de référence" },
            { status: 500 }
          );
        }

        const { data: urlData } = adminClient.storage
          .from("video-references")
          .getPublicUrl(uploadData.path);

        referenceImageUrl = urlData.publicUrl;
      }
    } else {
      const body = await request.json();
      modelId = body.model;
      prompt = body.prompt;
      duration = body.duration || 5;
      resolution = body.resolution || "720p";
      quality = body.quality || "standard";
      referenceImageUrl = body.referenceImageUrl || null;
    }

    // Validate prompt
    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt requis" },
        { status: 400 }
      );
    }

    // Get model info
    const { data: modelData, error: modelError } = await adminClient
      .from("video_models")
      .select("*")
      .eq("id", modelId)
      .eq("is_active", true)
      .single();

    if (modelError || !modelData) {
      return NextResponse.json(
        { error: "Modèle invalide ou désactivé" },
        { status: 400 }
      );
    }

    const model = modelData as VideoModel;

    // Validate duration
    if (duration < 1) duration = 1;
    if (duration > model.max_duration_seconds) {
      duration = model.max_duration_seconds;
    }

    // Calculate cost based on duration and quality
    const pricePerSecond = quality === "premium" && model.price_per_second_premium
      ? model.price_per_second_premium
      : model.price_per_second;

    // Apply markup from settings (default 50%)
    const { data: markupSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "markup")
      .single();

    const markupPercentage = markupSetting?.value?.percentage ?? 50;
    const baseCost = pricePerSecond * duration;
    const cost = baseCost * (1 + markupPercentage / 100);

    // Get user credits
    const credits = await getUserCredits(user.id);
    const isTrainer = credits.isTrainer === true;
    const isInOrg = !!credits.orgId;

    // Credit policy: same as image generation
    let canSpend = false;
    let usePersonalCredits = !isTrainer;

    if (isTrainer) {
      const spendCheck = await checkCanSpend(user.id, cost);
      canSpend = spendCheck.allowed;
    } else {
      canSpend = (credits.personalBalance ?? 0) >= cost;
    }

    if (!canSpend) {
      return NextResponse.json(
        {
          error: "Crédits insuffisants",
          required: cost,
          available: usePersonalCredits ? (credits.personalBalance ?? 0) : credits.balance,
          source: usePersonalCredits ? "personal" : credits.source,
          isStudent: !isTrainer && isInOrg,
        },
        { status: 402 }
      );
    }

    // Create generation record
    const { data: generation, error: genError } = await adminClient
      .from("video_generations")
      .insert({
        user_id: user.id,
        model_id: modelId,
        prompt,
        duration_seconds: duration,
        resolution,
        quality,
        reference_image_url: referenceImageUrl,
        cost,
        status: "generating",
      })
      .select("id")
      .single();

    if (genError || !generation) {
      console.error("Error creating generation record:", genError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement" },
        { status: 500 }
      );
    }

    const generationId = generation.id;

    try {
      // Generate video based on provider
      let videoUrl: string;
      let thumbnailUrl: string | undefined;
      let revisedPrompt: string | undefined;

      if (model.provider === "openai") {
        const result = await generateSoraVideo(
          modelId,
          prompt,
          duration,
          resolution,
          referenceImageUrl
        );
        videoUrl = result.videoUrl;
        thumbnailUrl = result.thumbnailUrl;
        revisedPrompt = result.revisedPrompt;
      } else if (model.provider === "google") {
        const result = await generateVeoVideo(
          modelId,
          prompt,
          duration,
          resolution,
          referenceImageUrl
        );
        videoUrl = result.videoUrl;
        thumbnailUrl = result.thumbnailUrl;
      } else {
        throw new Error(`Provider ${model.provider} not implemented`);
      }

      // Deduct credits after successful generation
      let deductResult: { success: boolean; remaining?: number; source?: string };

      if (usePersonalCredits) {
        const { data: personalDeduct } = await adminClient.rpc("deduct_credits", {
          p_user_id: user.id,
          p_amount: cost,
          p_description: `Video generation: ${model.name} (${duration}s)`,
        });

        if (personalDeduct === false) {
          console.error("Personal credit deduction failed after generation");
          deductResult = { success: false };
        } else {
          const { data: updatedProfile } = await adminClient
            .from("profiles")
            .select("credits_balance")
            .eq("id", user.id)
            .single();
          deductResult = {
            success: true,
            remaining: updatedProfile?.credits_balance ?? 0,
            source: "personal"
          };
        }
      } else {
        deductResult = await deductCredits(
          user.id,
          cost,
          `Video generation: ${model.name} (${duration}s)`
        );
      }

      if (!deductResult.success) {
        console.error("Credit deduction failed after generation");
      }

      // Update generation record with result
      await adminClient
        .from("video_generations")
        .update({
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          revised_prompt: revisedPrompt,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", generationId);

      return NextResponse.json({
        success: true,
        generation_id: generationId,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        revised_prompt: revisedPrompt,
        duration,
        cost,
        remaining_balance: deductResult.remaining ?? 0,
        source: deductResult.source,
      });
    } catch (genError) {
      console.error("Video generation error:", genError);

      await adminClient
        .from("video_generations")
        .update({
          status: "failed",
          error_message: genError instanceof Error ? genError.message : "Generation failed",
        })
        .eq("id", generationId);

      return NextResponse.json(
        {
          error:
            genError instanceof Error
              ? genError.message
              : "Erreur lors de la génération",
          code: "GENERATION_FAILED",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Video API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// GET /api/create/videos - Get user's generation history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: generations, error } = await supabase
      .from("video_generations")
      .select(`
        *,
        model:video_models(id, name, provider)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching generations:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'historique" },
        { status: 500 }
      );
    }

    const { count } = await supabase
      .from("video_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({
      generations,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Video history API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// Generate video using OpenAI Sora
async function generateSoraVideo(
  model: string,
  prompt: string,
  durationSeconds: number,
  resolution: string,
  referenceImageUrl: string | null
): Promise<{ videoUrl: string; thumbnailUrl?: string; revisedPrompt?: string }> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Map resolution to Sora size format
  const size = mapSoraResolution(resolution);

  // Determine if pro model
  const isPro = model === "sora-2-pro";

  // Prepare generation request
  // Note: Sora API may have different parameter names - adjust as needed
  const generateParams: {
    model: string;
    input: string | { type: string; text?: string; image_url?: string }[];
    n?: number;
    size?: string;
    duration?: number;
  } = {
    model: isPro ? "sora-2-pro" : "sora-2",
    input: referenceImageUrl
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: referenceImageUrl }
        ]
      : prompt,
    n: 1,
    size,
    duration: durationSeconds,
  };

  // @ts-expect-error - Sora API types may not be in openai package yet
  const response = await client.videos.generate(generateParams);

  // Extract video URL from response
  // Note: Actual response structure may differ
  const videoData = response.data?.[0] || response;

  if (!videoData?.url) {
    throw new Error("No video URL returned from Sora API");
  }

  return {
    videoUrl: videoData.url,
    thumbnailUrl: videoData.thumbnail_url,
    revisedPrompt: videoData.revised_prompt,
  };
}

// Generate video using Google Veo via REST API
async function generateVeoVideo(
  model: string,
  prompt: string,
  durationSeconds: number,
  resolution: string,
  referenceImageUrl: string | null
): Promise<{ videoUrl: string; thumbnailUrl?: string }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Google AI API key not configured");
  }

  // Determine model ID for the API
  // Available models: veo-3.1-generate-preview, veo-3.1-fast-generate-preview, veo-2.0-generate-001
  let veoModel: string;
  if (model === "veo-3.1-fast") {
    veoModel = "veo-3.1-fast-generate-preview";
  } else if (model === "veo-2") {
    veoModel = "veo-2.0-generate-001";
  } else {
    veoModel = "veo-3.1-generate-preview";
  }

  // Map resolution to aspect ratio
  const aspectRatio = mapVeoResolution(resolution);

  // Build request body using the correct Gemini API format
  // See: https://ai.google.dev/gemini-api/docs/video
  const instance: Record<string, unknown> = {
    prompt,
  };

  // Add optional parameters
  if (referenceImageUrl) {
    instance.image = { gcsUri: referenceImageUrl };
  }

  const requestBody = {
    instances: [instance],
    parameters: {
      aspectRatio,
      durationSeconds,
      sampleCount: 1,
    },
  };

  // Start video generation using predictLongRunning endpoint
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Veo API error response:", errorData);
    throw new Error(
      (errorData as { error?: { message?: string } })?.error?.message ||
      `Veo API error: ${response.status}`
    );
  }

  const data = await response.json() as {
    name?: string;
    done?: boolean;
    response?: { predictions?: Array<{ videoUri?: string }> };
    error?: { message?: string };
  };

  // Video generation is always async - poll for completion
  if (data.name) {
    const operationName = data.name;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (video gen can take a while)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const statusResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
        {
          headers: {
            "x-goog-api-key": apiKey,
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error(`Failed to check generation status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json() as {
        done?: boolean;
        response?: { predictions?: Array<{ videoUri?: string }> };
        error?: { message?: string };
      };

      if (statusData.done) {
        if (statusData.error) {
          throw new Error(statusData.error.message || "Veo generation failed");
        }

        const videoUri = statusData.response?.predictions?.[0]?.videoUri;
        if (videoUri) {
          return { videoUrl: videoUri };
        }
        throw new Error("No video URL in response");
      }

      attempts++;
    }

    throw new Error("Video generation timed out");
  }

  // Immediate response (unlikely for video)
  if (data.error) {
    throw new Error(data.error.message || "Veo generation failed");
  }

  const videoUri = data.response?.predictions?.[0]?.videoUri;
  if (!videoUri) {
    throw new Error("No video URL returned from Veo API");
  }

  return {
    videoUrl: videoUri,
    thumbnailUrl: undefined,
  };
}

// Map resolution string to Sora format
function mapSoraResolution(resolution: string): string {
  switch (resolution) {
    case "720p":
      return "1280x720";
    case "1280p":
      return "1280x720";
    case "1792p":
      return "1792x1024";
    default:
      return "1280x720";
  }
}

// Map resolution to Veo aspect ratio
function mapVeoResolution(resolution: string): string {
  switch (resolution) {
    case "4k":
    case "1080p":
    case "720p":
      return "16:9";
    default:
      return "16:9";
  }
}
