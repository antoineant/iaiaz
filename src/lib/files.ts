import { createAdminClient } from "@/lib/supabase/admin";
import type { FileType } from "@/types";

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];
export const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Word document MIME types
export const WORD_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function isWordMimeType(mimeType: string): boolean {
  return WORD_MIME_TYPES.includes(mimeType);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 o";
  const k = 1024;
  const sizes = ["o", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getFileType(mimeType: string): FileType | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return "document";
  return null;
}

export function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  return extensions[mimeType] || "bin";
}

export function isImageMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function isPdfMimeType(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

export async function getFileBase64(storagePath: string): Promise<string> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.storage
    .from("chat-attachments")
    .download(storagePath);

  if (error || !data) {
    throw new Error("Failed to download file");
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

export async function getSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.storage
    .from("chat-attachments")
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const fileType = getFileType(file.type);

  if (!fileType) {
    return {
      valid: false,
      error: "Type de fichier non supporté. Types acceptés: PNG, JPG, GIF, WebP, PDF, DOC, DOCX",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "Fichier trop volumineux. Taille maximale: 10 Mo",
    };
  }

  return { valid: true };
}

// Extract text from Word document
export async function extractWordText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
