import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Record generation and deduct credits via database function
    const { data: recordResult, error: recordError } = await adminClient.rpc(
      "record_image_generation",
      {
        p_user_id: user.id,
        p_model_id: modelId,
        p_prompt: prompt,
        p_size: size,
        p_style: style,
        p_quality: quality,
        p_reference_image_url: referenceImageUrl,
      }
    );

    if (recordError) {
      console.error("Error recording generation:", recordError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement" },
        { status: 500 }
      );
    }

    if (!recordResult?.success) {
      const errorCode = recordResult?.error;
      if (errorCode === "model_not_found") {
        return NextResponse.json(
          { error: "Modèle invalide ou désactivé" },
          { status: 400 }
        );
      }
      if (errorCode === "insufficient_credits") {
        return NextResponse.json(
          {
            error: "Crédits insuffisants",
            required: recordResult.required,
            available: recordResult.available,
          },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement" },
        { status: 500 }
      );
    }

    const generationId = recordResult.generation_id;

    // Get model info for provider
    const { data: modelData } = await adminClient
      .from("image_models")
      .select("*")
      .eq("id", modelId)
      .single();

    const model = modelData as ImageModel;

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
      } else {
        // For future providers (Stability, Replicate, etc.)
        throw new Error(`Provider ${model.provider} not implemented`);
      }

      // Complete generation
      await adminClient.rpc("complete_image_generation", {
        p_generation_id: generationId,
        p_image_url: imageUrl,
        p_revised_prompt: revisedPrompt,
      });

      return NextResponse.json({
        success: true,
        generation_id: generationId,
        image_url: imageUrl,
        revised_prompt: revisedPrompt,
        cost: recordResult.cost,
        remaining_balance: recordResult.remaining_balance,
      });
    } catch (genError) {
      // Generation failed - refund credits
      console.error("Image generation error:", genError);

      await adminClient.rpc("fail_image_generation", {
        p_generation_id: generationId,
        p_error_message:
          genError instanceof Error ? genError.message : "Generation failed",
      });

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
