"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn, formatCurrency } from "@/lib/utils";
import type { ChatMessage, FileAttachment } from "@/types";
import {
  User,
  Bot,
  Loader2,
  FileText,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { formatFileSize } from "@/lib/files";

interface MessageProps {
  message: ChatMessage;
}

function CopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
        "hover:bg-[var(--muted)]",
        className
      )}
      title={copied ? "Copié !" : "Copier"}
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

function CodeBlock({
  language,
  children,
}: {
  language: string | undefined;
  children: string;
}) {
  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton
          text={children}
          className="bg-[var(--background)]/80 backdrop-blur-sm"
        />
      </div>
      {language ? (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
          }}
        >
          {children}
        </SyntaxHighlighter>
      ) : (
        <pre className="bg-[#282c34] text-[#abb2bf] p-4 rounded-lg overflow-x-auto text-sm">
          <code>{children}</code>
        </pre>
      )}
    </div>
  );
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
        "flex gap-4 px-4 py-6 group",
        isUser ? "bg-[var(--background)]" : "bg-[var(--muted)]/50"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
            : "bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-medium text-sm">
            {isUser ? "Vous" : "Assistant"}
          </span>
          {/* Copy button for AI responses */}
          {!isUser && message.content && !message.isStreaming && (
            <CopyButton
              text={message.content}
              className="opacity-0 group-hover:opacity-100"
            />
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent">
          {message.isStreaming ? (
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Réflexion en cours...</span>
            </div>
          ) : message.content ? (
            isUser ? (
              // User messages: simple whitespace-pre-wrap
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              // AI messages: full markdown rendering
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom code block rendering
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isInline = !match && !className;

                    if (isInline) {
                      return (
                        <code
                          className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    return (
                      <CodeBlock language={match?.[1]}>
                        {String(children).replace(/\n$/, "")}
                      </CodeBlock>
                    );
                  },
                  // Custom link rendering
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {children}
                      </a>
                    );
                  },
                  // Custom table rendering
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-[var(--border)]">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-left font-semibold">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="border border-[var(--border)] px-3 py-2">
                        {children}
                      </td>
                    );
                  },
                  // Custom blockquote
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-4 border-primary-300 dark:border-primary-600 pl-4 italic text-[var(--muted-foreground)] my-4">
                        {children}
                      </blockquote>
                    );
                  },
                  // Custom horizontal rule
                  hr() {
                    return <hr className="my-6 border-[var(--border)]" />;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )
          ) : null}
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
