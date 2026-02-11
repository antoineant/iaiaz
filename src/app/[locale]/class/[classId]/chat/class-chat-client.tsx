"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ModelSelector } from "@/components/chat/model-selector";
import { Message } from "@/components/chat/message";
import { ChatInput, type RateLimitInfo } from "@/components/chat/chat-input";
import type { Conversation, ChatMessage, FileAttachment } from "@/types";
import type { PricingData } from "@/lib/pricing-db";
import { formatCurrency } from "@/lib/utils";
import {
  Sparkles,
  Brain,
  AlertTriangle,
  GraduationCap,
  ArrowLeft,
  Plus,
  MessageSquare,
  Trash2,
  Building2,
  LogOut,
  User,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getPreferredModel, setPreferredModel } from "@/components/chat/model-picker-overlay";
import { ContextLimitModal } from "@/components/chat/context-limit-modal";
import { ContextUsageIndicator } from "@/components/chat/context-usage-indicator";

interface ClassContext {
  classId: string;
  className: string;
  orgId: string;
  orgName: string;
  orgCredits: number;
}

interface UserInfo {
  displayName?: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface StudentClass {
  class_id: string;
  class_name: string;
  organization_name: string;
  is_accessible: boolean;
  credits_remaining: number;
}

interface ClassChatClientProps {
  userId: string;
  initialBalance: number;
  initialConversations: Conversation[];
  conversationId?: string;
  initialMessages?: ChatMessage[];
  pricingData: PricingData;
  classContext: ClassContext;
  userInfo?: UserInfo;
  limits?: {
    daily?: { used: number; limit: number; remaining: number };
    weekly?: { used: number; limit: number; remaining: number };
    monthly?: { used: number; limit: number; remaining: number };
  };
  studentClasses?: StudentClass[];
}

export function ClassChatClient({
  userId,
  initialBalance,
  initialConversations,
  conversationId,
  initialMessages = [],
  pricingData,
  classContext,
  userInfo,
  limits,
  studentClasses = [],
}: ClassChatClientProps) {
  const router = useRouter();
  const t = useTranslations("chat");
  const tClass = useTranslations("classChat");
  const tErrors = useTranslations("chat.errors");
  const locale = useLocale();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Get default model
  const defaultModel =
    pricingData.defaultModel ||
    pricingData.models.find((m) => m.is_recommended)?.id ||
    pricingData.models[0]?.id ||
    "claude-sonnet-4-20250514";

  const [balance, setBalance] = useState(initialBalance);
  const [conversations, setConversations] = useState(initialConversations);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [model, setModel] = useState(defaultModel);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [enableThinking, setEnableThinking] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showContextLimitModal, setShowContextLimitModal] = useState(false);
  const [contextLimitConversationId, setContextLimitConversationId] = useState<string | undefined>();
  const [totalTokens, setTotalTokens] = useState(0);

  // Load preferred model on mount
  useEffect(() => {
    const preferred = getPreferredModel();
    if (preferred && pricingData.models.find((m) => m.id === preferred && m.is_active)) {
      setModel(preferred);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate initial tokens from existing messages
  useEffect(() => {
    if (initialMessages.length > 0) {
      const total = initialMessages.reduce((acc, msg) => {
        if (msg.tokens) {
          return acc + msg.tokens.input + msg.tokens.output;
        }
        // Estimate tokens for messages without token data (~4 chars per token)
        return acc + Math.ceil(msg.content.length / 4);
      }, 0);
      setTotalTokens(total);
    }
  }, [initialMessages]);

  // Check if current model supports extended thinking
  const claudeSupportsThinking =
    model.includes("claude-3-7") ||
    model.includes("claude-sonnet-4") ||
    model.includes("claude-opus-4");
  const isOpenAIReasoning = model.startsWith("o1") || model.startsWith("o3");
  const supportsThinking = claudeSupportsThinking || isOpenAIReasoning;

  // Fetch rate limit status
  const fetchRateLimitStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/rate-limit?model=${model}`);
      if (response.ok) {
        const data = await response.json();
        setRateLimit({
          remaining: data.remaining,
          limit: data.limit,
          tier: data.tier,
          resetAt: data.reset_at,
        });
        if (data.remaining > 0) {
          setRateLimitError(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch rate limit status:", error);
    }
  }, [model]);

  useEffect(() => {
    fetchRateLimitStatus();
  }, [fetchRateLimitStatus]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(undefined);
    setTotalTokens(0);
    router.push(`/${locale}/class/${classContext.classId}/chat`);
  };

  // Handler for context limit: start fresh
  const handleContextLimitStartFresh = () => {
    setShowContextLimitModal(false);
    setContextLimitConversationId(undefined);
    handleNewConversation();
  };

  // Handler for context limit: continue with summary
  const handleContextLimitContinueWithSummary = (summary: string) => {
    setShowContextLimitModal(false);
    setContextLimitConversationId(undefined);
    // Start a new conversation
    setMessages([]);
    setCurrentConversationId(undefined);
    setTotalTokens(0);
    router.push(`/${locale}/class/${classContext.classId}/chat`);
    // Send the summary as the first message after a short delay
    setTimeout(() => {
      handleSendMessage(summary);
    }, 100);
  };

  // Handler for proactive context limit suggestion
  const handleSuggestNewConversation = () => {
    setContextLimitConversationId(currentConversationId);
    setShowContextLimitModal(true);
  };

  const handleDeleteConversation = async (id: string) => {
    setDeletingId(id);
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      handleNewConversation();
    }
    setDeletingId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleSendMessage = async (content: string, attachments?: FileAttachment[]) => {
    if (isLoading) return;

    setRateLimitError(null);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments,
    };
    setMessages((prev) => [...prev, userMessage]);

    const assistantMessageId = crypto.randomUUID();
    const thinkingEnabled = isOpenAIReasoning || (claudeSupportsThinking && enableThinking);
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        thinking: thinkingEnabled ? "" : undefined,
        isThinking: thinkingEnabled,
        isStreaming: true,
      },
    ]);

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          model,
          conversationId: currentConversationId,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          attachments: attachments?.map((a) => a.id) || [],
          stream: true,
          enableThinking: isOpenAIReasoning || (claudeSupportsThinking && enableThinking),
          classId: classContext.classId, // Pass class context!
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setMessages((prev) =>
          prev.filter((m) => m.id !== userMessage.id && m.id !== assistantMessageId)
        );
        if (data.rateLimit) {
          setRateLimit({
            remaining: 0,
            limit: data.rateLimit.limit,
            tier: data.rateLimit.tier,
            resetAt: data.rateLimit.resetAt,
          });
        }
        setRateLimitError(data.error);
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || tErrors("sendError"));
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedContent = "";
      let streamedThinking = "";
      let lastUpdateTime = 0;
      let lastThinkingUpdateTime = 0;
      const UPDATE_INTERVAL = 50;

      if (reader) {
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "thinking") {
                  streamedThinking += data.content;
                  const now = Date.now();
                  if (now - lastThinkingUpdateTime > UPDATE_INTERVAL) {
                    lastThinkingUpdateTime = now;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId
                          ? { ...m, thinking: streamedThinking, isThinking: true }
                          : m
                      )
                    );
                  }
                } else if (data.type === "chunk") {
                  streamedContent += data.content;
                  const now = Date.now();
                  if (now - lastUpdateTime > UPDATE_INTERVAL) {
                    lastUpdateTime = now;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId
                          ? { ...m, content: streamedContent, isThinking: false }
                          : m
                      )
                    );
                  }
                } else if (data.type === "done") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? {
                            ...m,
                            content: streamedContent,
                            thinking: data.thinking || streamedThinking,
                            cost: data.cost,
                            co2Grams: data.co2Grams,
                            tokens: {
                              input: data.tokensInput,
                              output: data.tokensOutput,
                            },
                            isThinking: false,
                            isStreaming: false,
                          }
                        : m
                    )
                  );

                  if (data.rateLimit) {
                    setRateLimit({
                      remaining: data.rateLimit.remaining,
                      limit: data.rateLimit.limit,
                      tier: data.rateLimit.tier,
                    });
                  }

                  setBalance((prev) => prev - data.cost);

                  // Update total tokens for context tracking
                  setTotalTokens((prev) => prev + data.tokensInput + data.tokensOutput);

                  if (data.conversationId && !currentConversationId) {
                    setCurrentConversationId(data.conversationId);
                    setConversations((prev) => [
                      {
                        id: data.conversationId,
                        user_id: userId,
                        title: content.slice(0, 50),
                        model,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        class_id: classContext.classId,
                      },
                      ...prev,
                    ]);
                  }
                } else if (data.type === "error") {
                  // Check for context length exceeded error
                  if (data.code === "CONTEXT_LENGTH_EXCEEDED") {
                    // Remove the failed messages
                    setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== assistantMessageId));
                    // Show the context limit modal
                    setContextLimitConversationId(data.conversationId || currentConversationId);
                    setShowContextLimitModal(true);
                    return;
                  }
                  throw new Error(data.error);
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: error instanceof Error ? error.message : tErrors("genericError"),
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[var(--background)] border-r border-[var(--border)] flex flex-col",
          "transform transition-transform lg:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <Link href="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            iaiaz
          </Link>
        </div>

        {/* Class context */}
        <div className="p-4 border-b border-[var(--border)] bg-primary-50 dark:bg-primary-900/20">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span className="font-semibold text-primary-700 dark:text-primary-300 truncate">
              {classContext.className}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{classContext.orgName}</span>
          </div>
          <div className="mt-3 text-sm">
            <span className="text-[var(--muted-foreground)]">{tClass("classCredits")}:</span>
            <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(balance)}
            </span>
          </div>
          {limits?.daily && (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              {t("sidebar.dailyLimit")}: {formatCurrency(limits.daily.remaining)} / {formatCurrency(limits.daily.limit)}
            </div>
          )}
        </div>

        {/* New conversation */}
        <div className="p-4">
          <Button className="w-full" onClick={handleNewConversation}>
            <Plus className="w-4 h-4 mr-2" />
            {tClass("newClassChat")}
          </Button>
        </div>

        {/* Class conversations */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] px-2 py-2">
            {tClass("classConversations")}
          </div>
          {conversations.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] px-2 py-4 text-center">
              {t("sidebar.noConversations")}
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <NextLink
                    href={`/${locale}/class/${classContext.classId}/chat/${conv.id}`}
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors group",
                      currentConversationId === conv.id
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                        : "hover:bg-[var(--muted)]"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{conv.title || t("sidebar.newConversation")}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className={cn(
                        "p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all",
                        deletingId === conv.id && "opacity-100"
                      )}
                      disabled={deletingId === conv.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </NextLink>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Other Classes section */}
        {studentClasses.length > 0 && (
          <div className="px-2 py-2 border-t border-[var(--border)]">
            <div className="text-xs font-semibold text-[var(--muted-foreground)] px-2 py-2">
              {t("sidebar.classes")}
            </div>
            <ul className="space-y-1">
              {studentClasses.slice(0, 3).map((cls) => (
                <li key={cls.class_id}>
                  <NextLink
                    href={cls.is_accessible
                      ? `/${locale}/class/${cls.class_id}/chat`
                      : `/${locale}/class/${cls.class_id}`
                    }
                    className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      cls.is_accessible ? "bg-green-500" : "bg-gray-400"
                    )} />
                    <GraduationCap className="w-4 h-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                    <span className="flex-1 truncate">{cls.class_name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {formatCurrency(cls.credits_remaining)}
                    </span>
                  </NextLink>
                </li>
              ))}
            </ul>
            {studentClasses.length > 3 && (
              <Link
                href="/dashboard/classes"
                className="flex items-center justify-center gap-1 px-2 py-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                onClick={() => setSidebarOpen(false)}
              >
                {t("sidebar.viewAllClasses")}
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] space-y-1">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <MessageSquare className="w-4 h-4" />
            {tClass("personalChat")}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <User className="w-4 h-4" />
            {t("sidebar.myAccount")}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            {t("sidebar.logout")}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] shadow-sm"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="lg:hidden w-10" />
          <div className="flex items-center gap-3">
            <ModelSelector
              value={model}
              onChange={(modelId) => {
                setModel(modelId);
                setPreferredModel(modelId);
              }}
              models={pricingData.models}
              markupMultiplier={pricingData.settings.markupMultiplier}
            />
            {claudeSupportsThinking && (
              <button
                onClick={() => setEnableThinking(!enableThinking)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  enableThinking
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/80 border border-transparent"
                }`}
                title={t("thinking.tooltip")}
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">{t("thinking.label")}</span>
              </button>
            )}
            {isOpenAIReasoning && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                title={t("thinking.reasoningTooltip")}
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">{t("thinking.reasoning")}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {enableThinking && claudeSupportsThinking && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t("thinking.costWarning")}</span>
              </div>
            )}
            {/* Credit source indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-sm">
              <GraduationCap className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-[var(--muted-foreground)]">{tClass("usingClassCredits")}:</span>
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{tClass("welcome.title")}</h1>
              <p className="text-[var(--muted-foreground)] max-w-md mb-2">
                {tClass("welcome.description")}
              </p>
              <p className="text-sm text-primary-600 dark:text-primary-400 mb-6">
                {classContext.className}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  { key: "python", text: t("suggestions.python") },
                  { key: "email", text: t("suggestions.email") },
                  { key: "summary", text: t("suggestions.summary") },
                  { key: "ideas", text: t("suggestions.ideas") },
                ].map((suggestion) => (
                  <button
                    key={suggestion.key}
                    onClick={() => handleSendMessage(suggestion.text)}
                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--muted)] transition-colors"
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Context Usage Warning */}
        {messages.length > 0 && (
          <ContextUsageIndicator
            totalTokens={totalTokens}
            maxContext={pricingData.models.find((m) => m.id === model)?.context_window || 128000}
            onSuggestNewConversation={handleSuggestNewConversation}
          />
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          model={model}
          balance={balance}
          isLoading={isLoading}
          disabled={balance <= 0}
          rateLimit={rateLimit}
          rateLimitError={rateLimitError}
          conversationId={currentConversationId}
          pricingData={pricingData}
        />
      </main>

      {/* Context Limit Modal */}
      <ContextLimitModal
        isOpen={showContextLimitModal}
        onClose={() => setShowContextLimitModal(false)}
        conversationId={contextLimitConversationId}
        onStartFresh={handleContextLimitStartFresh}
        onContinueWithSummary={handleContextLimitContinueWithSummary}
      />
    </div>
  );
}
