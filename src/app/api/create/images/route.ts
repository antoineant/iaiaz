import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCanSpend, deductCredits, getUserCredits } from "@/lib/credits";

interface ImageModel {
  id: string;
  name: string;
  provider: string;
  price_standard: number;
  price_hd: number | null;
  sizes: string[];
  styles: string[];
  supports_hd: boolean;
  supports_reference_image: boolean;
  max_prompt_length: number;
  is_active: boolean;
}

// POST /api/create/images - Generate an image
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

    // Check content type to determine how to parse
    const contentType = request.headers.get("content-type") || "";

    let modelId: string;
    let prompt: string;
    let size = "1024x1024";
    let style = "natural";
    let quality = "standard";
    let referenceImageUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Parse FormData for file uploads
      const formData = await request.formData();
      modelId = formData.get("model") as string;
      prompt = formData.get("prompt") as string;
      size = (formData.get("size") as string) || "1024x1024";
      style = (formData.get("style") as string) || "natural";
      quality = (formData.get("quality") as string) || "standard";

      const referenceImage = formData.get("referenceImage") as File | null;

      if (referenceImage && referenceImage.size > 0) {
        // Upload reference image to Supabase storage
        const fileName = `ref_${user.id}_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await adminClient.storage
          .from("image-references")
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

        // Get public URL
        const { data: urlData } = adminClient.storage
          .from("image-references")
          .getPublicUrl(uploadData.path);

        referenceImageUrl = urlData.publicUrl;
      }
    } else {
      // Parse JSON
      const body = await request.json();
      modelId = body.model;
      prompt = body.prompt;
      size = body.size || "1024x1024";
      style = body.style || "natural";
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

    // Get model info first to calculate cost
    const { data: modelData, error: modelError } = await adminClient
      .from("image_models")
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

    const model = modelData as ImageModel;

    // Calculate cost based on quality
    let baseCost = quality === "hd" && model.supports_hd && model.price_hd
      ? model.price_hd
      : model.price_standard;

    // Apply markup from settings
    const { data: markupSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "markup")
      .single();

    const markupPercentage = markupSetting?.value?.percentage ?? 50;
    const cost = baseCost * (1 + markupPercentage / 100);

    // Get user credits to check if trainer or student
    const credits = await getUserCredits(user.id);
    const isTrainer = credits.isTrainer === true;
    const isInOrg = !!credits.orgId;

    // Image generation credit policy:
    // - Trainers (owner/admin/teacher): use org credits
    // - Students: personal credits only (org credits reserved for chat/learning)
    let canSpend = false;
    let usePersonalCredits = !isTrainer; // Students always use personal

    if (isTrainer) {
      // Trainers use org credits via standard check
      const spendCheck = await checkCanSpend(user.id, cost);
      canSpend = spendCheck.allowed;
    } else {
      // Students use personal credits only
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

    // Create generation record (without deducting credits yet)
    const { data: generation, error: genError } = await adminClient
      .from("image_generations")
      .insert({
        user_id: user.id,
        model_id: modelId,
        prompt,
        size,
        style,
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
      // Generate image based on provider
      let imageUrl: string;
      let revisedPrompt: string | undefined;

      if (model.provider === "openai") {
        const result = await generateOpenAIImage(
          modelId,
          prompt,
          size,
          style,
          quality,
          referenceImageUrl
        );
        imageUrl = result.imageUrl;
        revisedPrompt = result.revisedPrompt;
      } else if (model.provider === "google") {
        const result = await generateGoogleImage(
          modelId,
          prompt,
          size,
          quality
        );
        imageUrl = result.imageUrl;
      } else {
        // For future providers (Stability, Replicate, etc.)
        throw new Error(`Provider ${model.provider} not implemented`);
      }

      // Deduct credits after successful generation
      // Trainers: use org credits, Students: use personal credits only
      let deductResult: { success: boolean; remaining?: number; source?: string };

      if (usePersonalCredits) {
        // Students: deduct from personal credits only
        const { data: personalDeduct } = await adminClient.rpc("deduct_credits", {
          p_user_id: user.id,
          p_amount: cost,
          p_description: `Image generation: ${model.name}`,
        });

        if (personalDeduct === false) {
          console.error("Personal credit deduction failed after generation");
          deductResult = { success: false };
        } else {
          // Get updated balance
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
        // Trainers: use org credits via standard deduction
        deductResult = await deductCredits(
          user.id,
          cost,
          `Image generation: ${model.name}`
        );
      }

      if (!deductResult.success) {
        // This shouldn't happen since we checked earlier, but handle it
        console.error("Credit deduction failed after generation");
      }

      // Update generation record with result
      await adminClient
        .from("image_generations")
        .update({
          image_url: imageUrl,
          revised_prompt: revisedPrompt,
          status: "completed",
        })
        .eq("id", generationId);

      return NextResponse.json({
        success: true,
        generation_id: generationId,
        image_url: imageUrl,
        revised_prompt: revisedPrompt,
        cost,
        remaining_balance: deductResult.remaining ?? 0,
        source: deductResult.source,
      });
    } catch (genError) {
      // Generation failed - don't deduct credits
      console.error("Image generation error:", genError);

      // Update generation record with failure
      await adminClient
        .from("image_generations")
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
    console.error("Image API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// GET /api/create/images - Get user's generation history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch user's generations
    const { data: generations, error } = await supabase
      .from("image_generations")
      .select(
        `
        *,
        model:image_models(id, name, provider, supports_reference_image)
      `
      )
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

    // Get total count
    const { count } = await supabase
      .from("image_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({
      generations,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Image history API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// Generate image using OpenAI (DALL-E or GPT Image models)
async function generateOpenAIImage(
  model: string,
  prompt: string,
  size: string,
  style: string,
  quality: string,
  referenceImageUrl: string | null
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Check if this is a new GPT image model or legacy DALL-E
  const isGptImageModel = model.startsWith("gpt-image");
  const isDallE3 = model === "dall-e-3";
  const isDallE2 = model === "dall-e-2";

  // Handle reference image with edit endpoint if provided
  if (referenceImageUrl && !isDallE2) {
    // Download reference image and convert to buffer
    const imageResponse = await fetch(referenceImageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Create a File object from the buffer for the API
    const imageFile = new File([imageBuffer], "reference.png", { type: "image/png" });

    // Use images.edit for reference-based generation
    // Note: OpenAI's edit endpoint modifies existing images
    // For style inspiration, we include reference info in the prompt
    const enhancedPrompt = `${prompt}\n\n[Style reference: Use the uploaded image as style and composition inspiration]`;

    try {
      // Try using the edit endpoint with the reference image
      const response = await client.images.edit({
        model: isDallE3 || isGptImageModel ? "dall-e-2" : model, // Edit only works with dall-e-2 currently
        image: imageFile,
        prompt: enhancedPrompt,
        n: 1,
        size: size === "auto" ? "1024x1024" : size as "256x256" | "512x512" | "1024x1024",
      });

      if (!response.data || response.data.length === 0 || !response.data[0]?.url) {
        throw new Error("No image returned from edit API");
      }

      return {
        imageUrl: response.data[0].url,
        revisedPrompt: undefined,
      };
    } catch (editError) {
      console.warn("Edit endpoint failed, falling back to generate:", editError);
      // Fall through to standard generation with enhanced prompt
    }
  }

  // Standard image generation
  const generateParams: {
    model: string;
    prompt: string;
    n: number;
    size: "256x256" | "512x512" | "1024x1024" | "1024x1792" | "1792x1024";
    style?: "natural" | "vivid";
    quality?: "standard" | "hd";
    response_format: "url";
  } = {
    model: isGptImageModel ? "dall-e-3" : model, // Map GPT image models to DALL-E 3 for now
    prompt: referenceImageUrl
      ? `${prompt}\n\n[Note: Generate in a style inspired by the reference image at: ${referenceImageUrl}]`
      : prompt,
    n: 1,
    size: mapSize(size, model),
    response_format: "url",
  };

  // Add style and quality for DALL-E 3 and GPT image models
  if (isDallE3 || isGptImageModel) {
    generateParams.style = style as "natural" | "vivid";
    generateParams.quality = quality as "standard" | "hd";
  }

  const response = await client.images.generate(generateParams);

  if (!response.data || response.data.length === 0) {
    throw new Error("No image returned from API");
  }

  const imageData = response.data[0];

  if (!imageData?.url) {
    throw new Error("No image URL returned from API");
  }

  return {
    imageUrl: imageData.url,
    revisedPrompt: imageData.revised_prompt,
  };
}

// Map size string to valid API size
function mapSize(size: string, model: string): "256x256" | "512x512" | "1024x1024" | "1024x1792" | "1792x1024" {
  const isDallE2 = model === "dall-e-2";

  if (size === "auto") {
    return "1024x1024";
  }

  // DALL-E 2 only supports these sizes
  if (isDallE2) {
    if (size === "256x256" || size === "512x512" || size === "1024x1024") {
      return size;
    }
    return "1024x1024";
  }

  // DALL-E 3 and GPT image models
  if (size === "1024x1024" || size === "1024x1792" || size === "1792x1024") {
    return size;
  }

  // Map other sizes to closest valid size
  if (size === "1024x1536" || size === "1536x1024") {
    return size.includes("1536x1024") ? "1792x1024" : "1024x1792";
  }

  return "1024x1024";
}

// Generate image using Google Imagen via REST API
async function generateGoogleImage(
  model: string,
  prompt: string,
  size: string,
  quality: string
): Promise<{ imageUrl: string }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Google AI API key not configured");
  }

  // Map model ID to API model name
  const modelName = model === "imagen-3-fast"
    ? "imagen-3.0-fast-generate-001"
    : "imagen-3.0-generate-002";

  // Map size to aspect ratio
  const aspectRatio = mapImagenAspectRatio(size);

  // Build request body
  const requestBody = {
    instances: [
      {
        prompt,
      },
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio,
      personGeneration: "allow_adult",
      ...(quality === "hd" && { outputOptions: { quality: "high" } }),
    },
  };

  // Call Imagen API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as { error?: { message?: string } })?.error?.message;
    throw new Error(errorMessage || `Imagen API error: ${response.status}`);
  }

  const data = await response.json() as {
    predictions?: Array<{
      bytesBase64Encoded?: string;
      mimeType?: string;
    }>;
  };

  const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!imageBase64) {
    throw new Error("No image returned from Imagen API");
  }

  // Upload base64 image to Supabase storage and return public URL
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  const fileName = `imagen_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
  const imageBuffer = Buffer.from(imageBase64, "base64");

  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from("generated-images")
    .upload(fileName, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading generated image:", uploadError);
    throw new Error("Failed to save generated image");
  }

  const { data: urlData } = adminClient.storage
    .from("generated-images")
    .getPublicUrl(uploadData.path);

  return {
    imageUrl: urlData.publicUrl,
  };
}

// Map size to Imagen aspect ratio
function mapImagenAspectRatio(size: string): string {
  switch (size) {
    case "1024x1024":
      return "1:1";
    case "1536x1024":
    case "1792x1024":
      return "3:2";
    case "1024x1536":
    case "1024x1792":
      return "2:3";
    case "16:9":
      return "16:9";
    case "9:16":
      return "9:16";
    default:
      return "1:1";
  }
}
