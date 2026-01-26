import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface GenerateRequest {
  model: string;
  prompt: string;
  size?: string;
  style?: string;
  quality?: string;
}

interface ImageModel {
  id: string;
  name: string;
  provider: string;
  price_standard: number;
  price_hd: number | null;
  sizes: string[];
  styles: string[];
  supports_hd: boolean;
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

    // Parse request
    const body: GenerateRequest = await request.json();
    const {
      model: modelId,
      prompt,
      size = "1024x1024",
      style = "natural",
      quality = "standard",
    } = body;

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
        const result = await generateDallE(
          modelId,
          prompt,
          size,
          style,
          quality
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
        model:image_models(id, name, provider)
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

// Generate image using OpenAI DALL-E
async function generateDallE(
  model: string,
  prompt: string,
  size: string,
  style: string,
  quality: string
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Map our parameters to DALL-E API
  const response = await client.images.generate({
    model: model, // dall-e-3 or dall-e-2
    prompt: prompt,
    n: 1,
    size: size as "256x256" | "512x512" | "1024x1024" | "1024x1792" | "1792x1024",
    style: model === "dall-e-3" ? (style as "natural" | "vivid") : undefined,
    quality: model === "dall-e-3" ? (quality as "standard" | "hd") : undefined,
    response_format: "url",
  });

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
