import type { ContentPart, MultimodalMessage } from "@/types";

// Legacy text-only message type (for backward compatibility)
interface TextMessage {
  role: "user" | "assistant";
  content: string;
}

// Unified message type
type UnifiedMessage = TextMessage | MultimodalMessage;

interface AIResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
}

// Helper to check if content is multimodal
function isMultimodalContent(
  content: string | ContentPart[]
): content is ContentPart[] {
  return Array.isArray(content);
}

// Anthropic (Claude) - supports images and PDFs natively
async function callAnthropic(
  model: string,
  messages: UnifiedMessage[]
): Promise<AIResponse> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Transform messages to Anthropic format
  const anthropicMessages = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }

    // Multimodal content
    const content = m.content.map((part: ContentPart) => {
      if (part.type === "text") {
        return { type: "text" as const, text: part.text };
      }
      if (part.type === "image") {
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: part.mimeType as
              | "image/png"
              | "image/jpeg"
              | "image/gif"
              | "image/webp",
            data: part.base64,
          },
        };
      }
      // PDF support via document type
      if (part.type === "document" && part.mimeType === "application/pdf") {
        return {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: part.base64,
          },
        };
      }
      return { type: "text" as const, text: "" };
    });

    return { role: m.role, content };
  });

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: anthropicMessages,
  });

  const textContent = response.content.find((c) => c.type === "text");

  return {
    content: textContent?.type === "text" ? textContent.text : "",
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
  };
}

// OpenAI (GPT) - supports images and files via data URLs
async function callOpenAI(
  model: string,
  messages: UnifiedMessage[]
): Promise<AIResponse> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Transform messages to OpenAI format
  const openaiMessages = messages.map((m) => {
    if (typeof m.content === "string") {
      if (m.role === "user") {
        return { role: "user" as const, content: m.content };
      }
      return { role: "assistant" as const, content: m.content };
    }

    // Multimodal content - only user messages can have multimodal content
    const content = m.content.map((part: ContentPart) => {
      if (part.type === "text") {
        return { type: "text" as const, text: part.text };
      }
      if (part.type === "image") {
        return {
          type: "image_url" as const,
          image_url: {
            url: `data:${part.mimeType};base64,${part.base64}`,
          },
        };
      }
      // GPT-5 supports PDFs via file input
      if (part.type === "document" && part.mimeType === "application/pdf") {
        return {
          type: "file" as const,
          file: {
            filename: part.filename,
            file_data: `data:${part.mimeType};base64,${part.base64}`,
          },
        };
      }
      return { type: "text" as const, text: "" };
    });

    // Multimodal content is only for user messages
    return { role: "user" as const, content };
  });

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 4096,
    messages: openaiMessages as Parameters<typeof client.chat.completions.create>[0]["messages"],
  });

  return {
    content: response.choices[0]?.message?.content || "",
    tokensInput: response.usage?.prompt_tokens || 0,
    tokensOutput: response.usage?.completion_tokens || 0,
  };
}

// Google (Gemini) - supports images and documents via inlineData
async function callGoogle(
  model: string,
  messages: UnifiedMessage[]
): Promise<AIResponse> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  const genModel = client.getGenerativeModel({ model });

  // Helper to convert content to Gemini parts
  const toParts = (content: string | ContentPart[]) => {
    if (typeof content === "string") {
      return [{ text: content }];
    }

    return content.map((part: ContentPart) => {
      if (part.type === "text") {
        return { text: part.text };
      }
      if (part.type === "image" || part.type === "document") {
        return {
          inlineData: {
            mimeType: part.mimeType,
            data: part.base64,
          },
        };
      }
      return { text: "" };
    });
  };

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : ("model" as const),
    parts: toParts(m.content),
  }));

  const lastMessage = messages[messages.length - 1];
  const lastParts = toParts(lastMessage.content);

  const chat = genModel.startChat({ history });
  const result = await chat.sendMessage(lastParts);
  const response = result.response;

  // Estimate tokens (Gemini doesn't always provide counts)
  const inputText = messages
    .map((m) =>
      typeof m.content === "string" ? m.content : "[multimodal content]"
    )
    .join(" ");
  const outputText = response.text();

  return {
    content: outputText,
    tokensInput: Math.ceil(inputText.length / 4),
    tokensOutput: Math.ceil(outputText.length / 4),
  };
}

// Mistral - supports images via image_url (snake_case per docs)
// Source: https://docs.mistral.ai/capabilities/vision
async function callMistral(
  model: string,
  messages: UnifiedMessage[]
): Promise<AIResponse> {
  const { Mistral } = await import("@mistralai/mistralai");
  const client = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  // Transform messages to Mistral format
  const mistralMessages = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role as "user" | "assistant", content: m.content };
    }

    // Multimodal content
    const content = m.content.map((part: ContentPart) => {
      if (part.type === "text") {
        return { type: "text" as const, text: part.text };
      }
      if (part.type === "image") {
        // Mistral SDK uses imageUrl (camelCase)
        return {
          type: "image_url" as const,
          imageUrl: `data:${part.mimeType};base64,${part.base64}`,
        };
      }
      // Mistral doesn't support PDFs via chat API (needs OCR API)
      if (part.type === "document") {
        return {
          type: "text" as const,
          text: `[Document joint: ${part.filename} - Ce modèle ne supporte pas les PDF]`,
        };
      }
      return { type: "text" as const, text: "" };
    });

    return { role: m.role as "user" | "assistant", content };
  });

  const response = await client.chat.complete({
    model,
    messages: mistralMessages,
  });

  const choice = response.choices?.[0];
  const content =
    typeof choice?.message?.content === "string" ? choice.message.content : "";

  return {
    content,
    tokensInput: response.usage?.promptTokens || 0,
    tokensOutput: response.usage?.completionTokens || 0,
  };
}

// Map model IDs to providers
function getProvider(
  modelId: string
): "anthropic" | "openai" | "google" | "mistral" {
  if (modelId.startsWith("claude-")) return "anthropic";
  if (modelId.startsWith("gpt-")) return "openai";
  if (modelId.startsWith("gemini-")) return "google";
  if (modelId.startsWith("mistral-") || modelId.startsWith("codestral-"))
    return "mistral";
  throw new Error(`Unknown model provider for: ${modelId}`);
}

// Main router function - supports both text-only and multimodal messages
export async function callAI(
  modelId: string,
  messages: UnifiedMessage[]
): Promise<AIResponse> {
  const provider = getProvider(modelId);

  switch (provider) {
    case "anthropic":
      return callAnthropic(modelId, messages);
    case "openai":
      return callOpenAI(modelId, messages);
    case "google":
      return callGoogle(modelId, messages);
    case "mistral":
      return callMistral(modelId, messages);
    default:
      throw new Error(`Modèle non supporté: ${modelId}`);
  }
}
