export interface User {
  id: string;
  email: string;
  credits_balance: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
  class_id?: string | null;  // If set, this is a class conversation
  organization_id?: string | null;  // If set, this is an org conversation (trainer)
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  tokens_input: number | null;
  tokens_output: number | null;
  cost: number | null;
  co2_grams: number | null;
  created_at: string;
  file_ids?: string[]; // Array of file attachment IDs
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "purchase" | "usage" | "refund" | "bonus";
  description: string | null;
  created_at: string;
}

export interface ApiUsage {
  id: string;
  user_id: string;
  message_id: string;
  provider: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_eur: number;
  co2_grams: number | null;
  created_at: string;
}

// File attachment types
export type FileType = "image" | "document";
export type UploadStatus = "pending" | "processing" | "ready" | "failed";

export interface FileAttachment {
  id: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  fileType: FileType;
  status: UploadStatus;
  url?: string; // Signed URL for display
}

export interface FileUploadRecord {
  id: string;
  user_id: string;
  message_id: string | null;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  file_type: FileType;
  status: UploadStatus;
  created_at: string;
}

// Multimodal content types for AI providers
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; mimeType: string; base64: string }
  | { type: "document"; mimeType: string; base64: string; filename: string };

export interface MultimodalMessage {
  role: "user" | "assistant";
  content: string | ContentPart[];
}

// Chat-related types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  isThinking?: boolean;
  cost?: number;
  co2Grams?: number;
  tokens?: {
    input: number;
    output: number;
  };
  isStreaming?: boolean;
  attachments?: FileAttachment[]; // File attachments
}

export interface CostEstimateResult {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model: string;
}
