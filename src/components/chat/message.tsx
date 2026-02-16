"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn, formatCurrency, formatCO2 } from "@/lib/utils";
import type { ChatMessage, FileAttachment } from "@/types";
import {
  User,
  Bot,
  Loader2,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Leaf,
  Brain,
  ChevronDown,
  ChevronRight,
  Volume2,
  Square,
} from "lucide-react";
import { formatFileSize } from "@/lib/files";
import { CodePreview, isPreviewableLanguage } from "./code-preview";
import { MessageErrorBoundary } from "./message-error-boundary";

export type TtsState = "idle" | "loading" | "playing";

interface MessageProps {
  message: ChatMessage;
  ttsState?: TtsState;
  onPlayTts?: (messageId: string, text: string) => void;
  onStopTts?: () => void;
}

function CopyButton({
  text,
  className,
  copiedLabel,
  copyLabel,
}: {
  text: string;
  className?: string;
  copiedLabel: string;
  copyLabel: string;
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
      title={copied ? copiedLabel : copyLabel}
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
  copiedLabel,
  copyLabel,
  showPreviewLabel,
  showCodeLabel,
}: {
  language: string | undefined;
  children: string;
  copiedLabel: string;
  copyLabel: string;
  showPreviewLabel: string;
  showCodeLabel: string;
}) {
  const [showCode, setShowCode] = useState(false);
  const isPreviewable = isPreviewableLanguage(language);

  return (
    <div className="my-4">
      {/* Preview for SVG, Mermaid, HTML */}
      {isPreviewable && language && (
        <CodePreview
          code={children}
          language={language}
          showPreviewLabel={showPreviewLabel}
          showCodeLabel={showCodeLabel}
        />
      )}

      {/* Code block - always shown for non-previewable, toggleable for previewable */}
      {isPreviewable ? (
        <div>
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-2"
          >
            {showCode ? "▼ Hide code" : "▶ Show code"}
          </button>
          {showCode && (
            <div className="relative group">
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <CopyButton
                  text={children}
                  className="bg-[var(--background)]/80 backdrop-blur-sm"
                  copiedLabel={copiedLabel}
                  copyLabel={copyLabel}
                />
              </div>
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
            </div>
          )}
        </div>
      ) : (
        <div className="relative group">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <CopyButton
              text={children}
              className="bg-[var(--background)]/80 backdrop-blur-sm"
              copiedLabel={copiedLabel}
              copyLabel={copyLabel}
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

function ThinkingBlock({
  thinking,
  isThinking,
  thinkingLabel,
}: {
  thinking: string;
  isThinking?: boolean;
  thinkingLabel: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinking && !isThinking) return null;

  return (
    <div className="mb-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        {isThinking ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Brain className="w-4 h-4" />
        )}
        <span>{thinkingLabel}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 ml-auto" />
        ) : (
          <ChevronRight className="w-4 h-4 ml-auto" />
        )}
      </button>
      {isExpanded && thinking && (
        <div className="px-3 pb-3 text-sm text-purple-900 dark:text-purple-100 whitespace-pre-wrap border-t border-purple-200 dark:border-purple-800 pt-2 max-h-64 overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  );
}

/** Strip <mifa_meta>...</mifa_meta> tags that may leak into displayed content */
function stripMifaMeta(content: string): string {
  return content.replace(/<mifa_meta>[\s\S]*?<\/mifa_meta>/g, "").trimEnd();
}

export function Message({ message, ttsState = "idle", onPlayTts, onStopTts }: MessageProps) {
  const t = useTranslations("chat.message");
  const isUser = message.role === "user";
  const displayContent = message.content && !isUser ? stripMifaMeta(message.content) : message.content;

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
            {isUser ? t("you") : t("assistant")}
          </span>
          {/* Action buttons for AI responses */}
          {!isUser && displayContent && !message.isStreaming && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
              {/* TTS play/stop button */}
              {onPlayTts && (
                <button
                  onClick={() =>
                    ttsState === "playing"
                      ? onStopTts?.()
                      : onPlayTts(message.id, displayContent)
                  }
                  disabled={ttsState === "loading"}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                    "hover:bg-[var(--muted)]",
                    ttsState === "loading" && "opacity-50 cursor-not-allowed"
                  )}
                  title={ttsState === "playing" ? t("stop") : t("play")}
                >
                  {ttsState === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : ttsState === "playing" ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              )}
              <CopyButton
                text={displayContent}
                copiedLabel={t("copied")}
                copyLabel={t("copy")}
              />
            </div>
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

        {/* Thinking block for Claude extended thinking */}
        {!isUser && (message.thinking || message.isThinking) && (
          <ThinkingBlock
            thinking={message.thinking || ""}
            isThinking={message.isThinking}
            thinkingLabel={t("thinkingProcess")}
          />
        )}

        <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent">
          {message.isStreaming && !displayContent && !message.thinking ? (
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t("thinking")}</span>
            </div>
          ) : displayContent ? (
            isUser ? (
              // User messages: simple whitespace-pre-wrap
              <div className="whitespace-pre-wrap">{displayContent}</div>
            ) : (
              // AI messages: full markdown rendering with error boundary
              <MessageErrorBoundary fallbackContent={displayContent}>
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
                        <CodeBlock
                          language={match?.[1]}
                          copiedLabel={t("copied")}
                          copyLabel={t("copy")}
                          showPreviewLabel={t("showPreview")}
                          showCodeLabel={t("showCode")}
                        >
                          {String(children).replace(/\n$/, "")}
                        </CodeBlock>
                      );
                    },
                    // Custom pre block for ASCII art and diagrams
                    pre({ children, ...props }) {
                      // Check if this is a code block (has code child) or raw pre
                      const childArray = Array.isArray(children) ? children : [children];
                      const hasCodeChild = childArray.some(
                        (child) => typeof child === "object" && child !== null && "type" in child && child.type === "code"
                      );

                      if (hasCodeChild) {
                        // Let the code component handle it
                        return <>{children}</>;
                      }

                      // Raw pre block (ASCII art, diagrams) - use monospace font
                      return (
                        <pre
                          className="bg-[var(--muted)] p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre my-4"
                          style={{ fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace" }}
                          {...props}
                        >
                          {children}
                        </pre>
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
                  {displayContent}
                </ReactMarkdown>
              </MessageErrorBoundary>
            )
          ) : null}
        </div>

        {message.tokens && !message.isStreaming && (
          <div className="mt-2 text-xs text-[var(--muted-foreground)] flex items-center gap-1 flex-wrap">
            {message.tokens.input > 0 && (
              <>
                <span>
                  {message.tokens.input.toLocaleString()} tokens •{" "}
                  {message.tokens.output.toLocaleString()} tokens
                </span>
                {message.cost !== undefined && message.cost > 0 && (
                  <span className="font-medium text-[var(--foreground)]">
                    • {formatCurrency(message.cost)}
                  </span>
                )}
                {message.co2Grams !== undefined && message.co2Grams > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400">
                    • <Leaf className="w-3 h-3" /> {formatCO2(message.co2Grams)}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
