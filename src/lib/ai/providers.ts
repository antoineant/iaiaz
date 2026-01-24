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

// Streaming callback types
export type StreamCallback = (chunk: string) => void;
export type ThinkingCallback = (chunk: string) => void;

interface AIStreamResponse {
  content: string;
  thinking?: string;
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

// ============= STREAMING IMPLEMENTATIONS =============

// Anthropic streaming
async function callAnthropicStream(
  model: string,
  messages: UnifiedMessage[],
  onChunk: StreamCallback,
  onThinking?: ThinkingCallback
): Promise<AIStreamResponse> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Transform messages to Anthropic format (same as non-streaming)
  const anthropicMessages = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }

    const content = m.content.map((part: ContentPart) => {
      if (part.type === "text") {
        return { type: "text" as const, text: part.text };
      }
      if (part.type === "image") {
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: part.mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
            data: part.base64,
          },
        };
      }
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

  let fullContent = "";
  let fullThinking = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let currentBlockType: "thinking" | "text" | null = null;

  // Check if model supports extended thinking (claude-3-7 and newer)
  const supportsThinking = model.includes("claude-3-7") ||
                           model.includes("claude-sonnet-4") ||
                           model.includes("claude-opus-4");

  // Build request options
  const requestOptions: Parameters<typeof client.messages.stream>[0] = {
    model,
    max_tokens: supportsThinking ? 16000 : 4096,
    messages: anthropicMessages,
  };

  // Add thinking configuration for supported models
  if (supportsThinking && onThinking) {
    (requestOptions as unknown as Record<string, unknown>).thinking = {
      type: "enabled",
      budget_tokens: 10000,
    };
  }

  const stream = await client.messages.stream(requestOptions);

  for await (const event of stream) {
    // Track which block type we're in
    if (event.type === "content_block_start") {
      if (event.content_block?.type === "thinking") {
        currentBlockType = "thinking";
      } else if (event.content_block?.type === "text") {
        currentBlockType = "text";
      }
    }

    // Handle content deltas
    if (event.type === "content_block_delta") {
      if (event.delta.type === "thinking_delta" && onThinking) {
        const thinking = (event.delta as { type: "thinking_delta"; thinking: string }).thinking;
        fullThinking += thinking;
        onThinking(thinking);
      } else if (event.delta.type === "text_delta") {
        const text = event.delta.text;
        fullContent += text;
        onChunk(text);
      }
    }

    if (event.type === "message_delta" && event.usage) {
      outputTokens = event.usage.output_tokens;
    }
    if (event.type === "message_start" && event.message.usage) {
      inputTokens = event.message.usage.input_tokens;
    }
  }

  return {
    content: fullContent,
    thinking: fullThinking || undefined,
    tokensInput: inputTokens,
    tokensOutput: outputTokens,
  };
}

// OpenAI streaming
async function callOpenAIStream(
  model: string,
  messages: UnifiedMessage[],
  onChunk: StreamCallback,
  onThinking?: ThinkingCallback
): Promise<AIStreamResponse> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Check if this is a reasoning model (o1, o3)
  const isReasoningModel = model.startsWith("o1") || model.startsWith("o3");

  // Transform messages (same as non-streaming)
  const openaiMessages = messages.map((m) => {
    if (typeof m.content === "string") {
      if (m.role === "user") {
        return { role: "user" as const, content: m.content };
      }
      return { role: "assistant" as const, content: m.content };
    }

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

    return { role: "user" as const, content };
  });

  let fullContent = "";
  let fullThinking = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = await client.chat.completions.create({
    model,
    max_completion_tokens: isReasoningModel ? 16000 : 4096,
    messages: openaiMessages as Parameters<typeof client.chat.completions.create>[0]["messages"],
    stream: true,
    stream_options: { include_usage: true },
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;

    // Handle reasoning content for o1/o3 models
    if (isReasoningModel && onThinking) {
      const reasoning = (delta as unknown as { reasoning_content?: string })?.reasoning_content;
      if (reasoning) {
        fullThinking += reasoning;
        onThinking(reasoning);
      }
    }

    // Handle regular content
    const content = delta?.content;
    if (content) {
      fullContent += content;
      onChunk(content);
    }

    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens || 0;
      outputTokens = chunk.usage.completion_tokens || 0;
    }
  }

  return {
    content: fullContent,
    thinking: fullThinking || undefined,
    tokensInput: inputTokens,
    tokensOutput: outputTokens,
  };
}

// Mistral streaming
async function callMistralStream(
  model: string,
  messages: UnifiedMessage[],
  onChunk: StreamCallback
): Promise<AIStreamResponse> {
  const { Mistral } = await import("@mistralai/mistralai");
  const client = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  // Transform messages (same as non-streaming)
  const mistralMessages = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role as "user" | "assistant", content: m.content };
    }

    const content = m.content.map((part: ContentPart) => {
      if (part.type === "text") {
        return { type: "text" as const, text: part.text };
      }
      if (part.type === "image") {
        return {
          type: "image_url" as const,
          imageUrl: `data:${part.mimeType};base64,${part.base64}`,
        };
      }
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

  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = await client.chat.stream({
    model,
    messages: mistralMessages,
  });

  for await (const event of stream) {
    const rawContent = event.data.choices[0]?.delta?.content;
    if (rawContent) {
      // Content can be string or ContentChunk[] - extract text
      const content = typeof rawContent === "string"
        ? rawContent
        : rawContent.map(c => "text" in c ? c.text : "").join("");
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }
    if (event.data.usage) {
      inputTokens = event.data.usage.promptTokens || 0;
      outputTokens = event.data.usage.completionTokens || 0;
    }
  }

  return {
    content: fullContent,
    tokensInput: inputTokens,
    tokensOutput: outputTokens,
  };
}

// Google streaming
async function callGoogleStream(
  model: string,
  messages: UnifiedMessage[],
  onChunk: StreamCallback
): Promise<AIStreamResponse> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  const genModel = client.getGenerativeModel({ model });

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

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : ("model" as const),
    parts: toParts(m.content),
  }));

  const lastMessage = messages[messages.length - 1];
  const lastParts = toParts(lastMessage.content);

  const chat = genModel.startChat({ history });
  const result = await chat.sendMessageStream(lastParts);

  let fullContent = "";
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullContent += text;
      onChunk(text);
    }
  }

  // Estimate tokens
  const inputText = messages
    .map((m) => typeof m.content === "string" ? m.content : "[multimodal content]")
    .join(" ");

  return {
    content: fullContent,
    tokensInput: Math.ceil(inputText.length / 4),
    tokensOutput: Math.ceil(fullContent.length / 4),
  };
}

// ============= END STREAMING IMPLEMENTATIONS =============

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

// Streaming router function
export async function callAIStream(
  modelId: string,
  messages: UnifiedMessage[],
  onChunk: StreamCallback,
  onThinking?: ThinkingCallback
): Promise<AIStreamResponse> {
  const provider = getProvider(modelId);

  switch (provider) {
    case "anthropic":
      return callAnthropicStream(modelId, messages, onChunk, onThinking);
    case "openai":
      return callOpenAIStream(modelId, messages, onChunk, onThinking);
    case "google":
      return callGoogleStream(modelId, messages, onChunk);
    case "mistral":
      return callMistralStream(modelId, messages, onChunk);
    default:
      throw new Error(`Modèle non supporté: ${modelId}`);
  }
}
