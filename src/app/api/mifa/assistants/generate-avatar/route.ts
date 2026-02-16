import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE_STYLE_PROMPT =
  "Flat vector character icon, circular avatar format, transparent background. " +
  "Digital creature mascot for a teen education app. " +
  "Style: clean modern illustration, slightly geometric, dark body with neon glow accents. " +
  "Not cute/childish — cool and sleek, like a game UI icon. " +
  "Simple enough to read at 64px. No text.";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { name, color, purpose } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  const userContext = [
    color ? `Neon accent color: ${color}.` : null,
    `Personality: ${[purpose, name].filter(Boolean).join(" / ")}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const fullPrompt = `${BASE_STYLE_PROMPT} ${userContext}`;

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      style: "vivid",
      quality: "standard",
      response_format: "url",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("No image returned from API");
    }

    // Download the image and upload to Supabase storage
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const adminClient = createAdminClient();
    const fileName = `mifa-avatars/${user.id}_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from("generated-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading mifa avatar:", uploadError);
      return NextResponse.json(
        { error: "Erreur lors de l'upload de l'avatar" },
        { status: 500 }
      );
    }

    const { data: urlData } = adminClient.storage
      .from("generated-images")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({ imageUrl: urlData.publicUrl });
  } catch (err) {
    console.error("Mifa avatar generation error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération de l'avatar" },
      { status: 500 }
    );
  }
}
