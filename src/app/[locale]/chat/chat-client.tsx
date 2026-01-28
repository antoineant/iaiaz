"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/chat/sidebar";
import { ModelSelector } from "@/components/chat/model-selector";
import { Message } from "@/components/chat/message";
import { ChatInput, type RateLimitInfo } from "@/components/chat/chat-input";
import type { Conversation, ChatMessage, FileAttachment } from "@/types";
import type { PricingData } from "@/lib/pricing-db";
import { Sparkles, Brain, AlertTriangle, MessageSquare, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  ModelPickerOverlay,
  shouldShowModelPicker,
  getPreferredModel,
  setPreferredModel,
} from "@/components/chat/model-picker-overlay";

interface OrgContext {
  orgName: string;
  role: string;
  limits?: {
    daily?: { used: number; limit: number; remaining: number };
    weekly?: { used: number; limit: number; remaining: number };
    monthly?: { used: number; limit: number; remaining: number };
  };
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

interface ManagedClass {
  id: string;
  name: string;
  status: string;
  is_active: boolean;
  student_count: number;
}

interface ChatClientProps {
  userId: string;
  initialBalance: number;
  personalBalance?: number;
  isTrainer?: boolean;
  initialConversations: Conversation[];
  conversationId?: string;
  initialMessages?: ChatMessage[];
  pricingData: PricingData;
  orgContext?: OrgContext;
  userInfo?: UserInfo;
}

export function ChatClient({
  userId,
  initialBalance,
  personalBalance,
  isTrainer,
  initialConversations,
  conversationId,
  initialMessages = [],
  pricingData,
  orgContext,
  userInfo,
}: ChatClientProps) {
  const router = useRouter();
  const t = useTranslations("chat");
  const tErrors = useTranslations("chat.errors");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Get default model from settings, falling back to recommended or first available
  const defaultModel = pricingData.defaultModel ||
                       pricingData.models.find((m) => m.is_recommended)?.id ||
                       pricingData.models[0]?.id ||
                       "claude-sonnet-4-20250514";

  const [balance, setBalance] = useState(initialBalance);
  const [conversations, setConversations] = useState(initialConversations);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [model, setModel] = useState(defaultModel);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >(conversationId);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [managedClasses, setManagedClasses] = useState<ManagedClass[]>([]);
  const [enableThinking, setEnableThinking] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // Initialize model picker state and preferred model
  useEffect(() => {
    // Check if we should show the model picker
    if (!conversationId && messages.length === 0) {
      setShowModelPicker(shouldShowModelPicker());
    }
    // Load preferred model if set
    const preferred = getPreferredModel();
    if (preferred && pricingData.models.find((m) => m.id === preferred && m.is_active)) {
      setModel(preferred);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if user can manage org (owner/admin/teacher)
  const canManageOrg = orgContext && ["owner", "admin", "teacher"].includes(orgContext.role);

  // Check if current model supports extended thinking (Claude - opt-in)
  const claudeSupportsThinking = model.includes("claude-3-7") ||
                                 model.includes("claude-sonnet-4") ||
                                 model.includes("claude-opus-4");

  // Check if model is OpenAI reasoning model (o1/o3 - always on)
  const isOpenAIReasoning = model.startsWith("o1") || model.startsWith("o3");

  // Combined: does model support thinking/reasoning?
  const supportsThinking = claudeSupportsThinking || isOpenAIReasoning;

  // Fetch classes on mount - managed classes for trainers, student classes for students
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        if (canManageOrg) {
          // Trainers see their managed classes
          const response = await fetch("/api/org/classes");
          if (response.ok) {
            const data = await response.json();
            setManagedClasses(data || []);
          }
        } else {
          // Students see classes they're enrolled in
          const response = await fetch("/api/student/classes");
          if (response.ok) {
            const data = await response.json();
            setClasses(data.active_classes || []);
          }
        }
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      }
    };
    fetchClasses();
  }, [canManageOrg]);

  // Fetch rate limit status when model changes
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
        // Clear error if limit is restored
        if (data.remaining > 0) {
          setRateLimitError(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch rate limit status:", error);
    }
  }, [model]);

  // Fetch rate limit on mount and when model changes
  useEffect(() => {
    fetchRateLimitStatus();
  }, [fetchRateLimitStatus]);

  // Auto-refresh rate limit status when rate limited
  useEffect(() => {
    if (rateLimit?.remaining === 0 && rateLimit?.resetAt) {
      const resetTime = new Date(rateLimit.resetAt).getTime();
      const now = Date.now();
      const delay = Math.max(0, resetTime - now + 1000); // Add 1 second buffer

      const timeout = setTimeout(() => {
        fetchRateLimitStatus();
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [rateLimit, fetchRateLimitStatus]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(undefined);
    router.push("/chat");
  };

  const handleDeleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      handleNewConversation();
    }
  };

  const handleSendMessage = async (
    content: string,
    attachments?: FileAttachment[]
  ) => {
    if (isLoading) return;

    // Clear any previous rate limit error
    setRateLimitError(null);

    // Add user message immediately (with attachments if any)
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder for assistant
    const assistantMessageId = crypto.randomUUID();
    // Thinking enabled for Claude (opt-in) or OpenAI reasoning (always)
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
          // Enable thinking for Claude (opt-in) or OpenAI reasoning models (always)
          enableThinking: isOpenAIReasoning || (claudeSupportsThinking && enableThinking),
        }),
      });

      // Handle rate limit error specially
      if (response.status === 429) {
        const data = await response.json();
        // Remove the user message and placeholder
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== assistantMessageId));

        // Update rate limit state
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
      const UPDATE_INTERVAL = 50; // Update UI every 50ms max

      if (reader) {
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "thinking") {
                  streamedThinking += data.content;
                  // Throttle thinking UI updates
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
                  // Throttle UI updates to prevent lag
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
                  // Update with final metadata
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

                  // Update rate limit from response
                  if (data.rateLimit) {
                    setRateLimit({
                      remaining: data.rateLimit.remaining,
                      limit: data.rateLimit.limit,
                      tier: data.rateLimit.tier,
                    });
                  }

                  // Update balance
                  setBalance((prev) => prev - data.cost);

                  // Update conversation ID if new
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
                      },
                      ...prev,
                    ]);
                  }
                } else if (data.type === "error") {
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
      // Remove streaming message and show error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content:
                  error instanceof Error
                    ? error.message
                    : tErrors("genericError"),
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
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        balance={balance}
        personalBalance={personalBalance}
        isTrainer={isTrainer}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        orgContext={orgContext ? {
          orgName: orgContext.orgName,
          role: orgContext.role,
          limits: orgContext.limits ? {
            daily: orgContext.limits.daily ? { remaining: orgContext.limits.daily.remaining, limit: orgContext.limits.daily.limit } : undefined,
            weekly: orgContext.limits.weekly ? { remaining: orgContext.limits.weekly.remaining, limit: orgContext.limits.weekly.limit } : undefined,
            monthly: orgContext.limits.monthly ? { remaining: orgContext.limits.monthly.remaining, limit: orgContext.limits.monthly.limit } : undefined,
          } : undefined,
        } : undefined}
        userInfo={userInfo}
        classes={classes}
        managedClasses={managedClasses}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="lg:hidden w-10" /> {/* Spacer for mobile menu */}
          <div className="flex items-center gap-3">
            <ModelSelector
              value={model}
              onChange={(modelId) => {
                setModel(modelId);
                setPreferredModel(modelId);
              }}
              models={pricingData.models}
              markupMultiplier={pricingData.settings.markupMultiplier}
              externalOpen={modelSelectorOpen}
              onOpenChange={setModelSelectorOpen}
            />
            {/* Extended Thinking Toggle (Claude) */}
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
            {/* Reasoning indicator (OpenAI o1/o3 - always on) */}
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
            {/* Cost warning when thinking enabled (Claude) */}
            {enableThinking && claudeSupportsThinking && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t("thinking.costWarning")}</span>
              </div>
            )}
            {/* Credit source indicator */}
            {orgContext ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--muted)] text-sm">
                <Building2 className="w-4 h-4 text-[var(--muted-foreground)]" />
                <span className="text-[var(--muted-foreground)] hidden sm:inline">{t("usingOrgCredits")}:</span>
                <span className="font-semibold">{formatCurrency(balance)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--muted)] text-sm">
                <MessageSquare className="w-4 h-4 text-[var(--muted-foreground)]" />
                <span className="text-[var(--muted-foreground)] hidden sm:inline">{t("usingPersonalCredits")}:</span>
                <span className="font-semibold">{formatCurrency(balance)}</span>
              </div>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            showModelPicker ? (
              <ModelPickerOverlay
                pricingData={pricingData}
                currentModel={model}
                onSelectModel={(modelId) => {
                  setModel(modelId);
                  setShowModelPicker(false);
                }}
                onClose={() => setShowModelPicker(false)}
                onBrowseModels={() => {
                  setShowModelPicker(false);
                  setModelSelectorOpen(true);
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">
                  {t("welcome.title")}
                </h1>
                <p className="text-[var(--muted-foreground)] max-w-md mb-6">
                  {t("welcome.description")}
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
            )
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          model={model}
          balance={balance}
          isLoading={isLoading}
          disabled={balance <= 0 || showModelPicker}
          rateLimit={rateLimit}
          rateLimitError={rateLimitError}
          conversationId={currentConversationId}
          pricingData={pricingData}
        />
      </main>
    </div>
  );
}
