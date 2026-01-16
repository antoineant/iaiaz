"use client";

import { cn, formatCurrency } from "@/lib/utils";
import type { ChatMessage, FileAttachment } from "@/types";
import { User, Bot, Loader2, FileText, ExternalLink } from "lucide-react";
import { formatFileSize } from "@/lib/files";

interface MessageProps {
  message: ChatMessage;
}

function AttachmentPreview({ attachment }: { attachment: FileAttachment }) {
  if (attachment.fileType === "image") {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs hover:opacity-90 transition-opacity"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.originalFilename}
          className="rounded-lg border border-[var(--border)] max-h-64 object-contain"
        />
      </a>
    );
  }

  // PDF/Document
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-colors max-w-xs"
    >
      <FileText className="w-10 h-10 text-red-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {attachment.originalFilename}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {formatFileSize(attachment.fileSize)}
        </p>
      </div>
      <ExternalLink className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
    </a>
  );
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-6",
        isUser ? "bg-[var(--background)]" : "bg-[var(--muted)]/50"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-primary-100 text-primary-600"
            : "bg-accent-100 text-accent-600"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isUser ? "Vous" : "Assistant"}
          </span>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        <div className="prose prose-sm max-w-none">
          {message.isStreaming ? (
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Réflexion en cours...</span>
            </div>
          ) : (
            message.content && (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )
          )}
        </div>

        {message.tokens && !message.isStreaming && (
          <div className="mt-2 text-xs text-[var(--muted-foreground)]">
            {message.tokens.input > 0 && (
              <span>
                {message.tokens.input.toLocaleString("fr-FR")} tokens entrée •{" "}
                {message.tokens.output.toLocaleString("fr-FR")} tokens sortie
                {message.cost !== undefined && message.cost > 0 && (
                  <span className="font-medium text-[var(--foreground)]">
                    {" "}
                    • {formatCurrency(message.cost)}
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
