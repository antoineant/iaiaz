import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const maxDuration = 30;

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const locale = (formData.get("locale") as string) || "fr";

    if (!audioFile) {
      return NextResponse.json({ error: "Audio file required" }, { status: 400 });
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: "Audio file too large (max 25MB)" },
        { status: 400 }
      );
    }

    if (!audioFile.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Use the locale as a hint but also provide a prompt in the target language
    // to prevent Whisper from translating instead of transcribing.
    // The prompt biases the model toward the expected language.
    const promptByLocale: Record<string, string> = {
      fr: "Transcription en français.",
      en: "Transcription in English.",
    };

    const transcription = await client.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      language: locale === "fr" ? "fr" : "en",
      prompt: promptByLocale[locale] || promptByLocale.fr,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
