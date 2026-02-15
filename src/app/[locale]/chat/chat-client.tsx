"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/chat/sidebar";
import { ModelSelector } from "@/components/chat/model-selector";
import { Message, type TtsState } from "@/components/chat/message";
import { createAudioPlayer } from "@/lib/audio/player";
import { ChatInput, type RateLimitInfo } from "@/components/chat/chat-input";
import type { Conversation, ChatMessage, FileAttachment, CustomAssistant } from "@/types";
import type { PricingData } from "@/lib/pricing-db";
import { Sparkles, Brain, AlertTriangle, MessageSquare, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  ModelPickerOverlay,
  shouldShowModelPicker,
  getPreferredModel,
  setPreferredModel,
} from "@/components/chat/model-picker-overlay";
import { ContextLimitModal } from "@/components/chat/context-limit-modal";
import { ContextUsageIndicator } from "@/components/chat/context-usage-indicator";
import { FamiliaWelcome } from "@/components/familia/familia-welcome";
import { FamiliaParentWelcome } from "@/components/familia/familia-parent-welcome";
import { applyAccentColor, getThemeColor } from "@/lib/familia/theme";

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

interface AssistantInfo {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface FamiliaMode {
  assistants: CustomAssistant[];
  accentColor: string | null;
  supervisionMode: string;
  userName: string;
  dailyCreditLimit?: number | null;
  dailyCreditsUsed?: number;
  cumulativeCredits?: boolean;
  weeklyCreditsUsed?: number;
  creditsAllocated?: number;
}

interface FamiliaParentMode {
  orgId: string;
  orgName: string;
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
  assistantInfo?: AssistantInfo;
  familiaMode?: FamiliaMode;
  familiaParentMode?: FamiliaParentMode;
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
  assistantInfo,
  familiaMode,
  familiaParentMode,
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
  const [showContextLimitModal, setShowContextLimitModal] = useState(false);
  const [contextLimitConversationId, setContextLimitConversationId] = useState<string | undefined>();
  const [totalTokens, setTotalTokens] = useState(0);

  // Familia state
  const [familiaAssistants, setFamiliaAssistants] = useState<CustomAssistant[]>(familiaMode?.assistants || []);
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantInfo | undefined>(assistantInfo);
  const [familiaAccentColor, setFamiliaAccentColor] = useState<string | null>(familiaMode?.accentColor || null);

  // TTS state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [ttsLoadingMessageId, setTtsLoadingMessageId] = useState<string | null>(null);
  const audioPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // Initialize model picker state and preferred model
  useEffect(() => {
    // Check if we should show the model picker (not for familia teens or parents)
    if (!conversationId && messages.length === 0 && !familiaMode && !familiaParentMode) {
      setShowModelPicker(shouldShowModelPicker());
    }
    // Load preferred model if set
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
    setTotalTokens(0);
    setSelectedAssistant(undefined); // Clear selected assistant for familia
    router.push("/chat");
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
    router.push("/chat");
    // Send the summary as the first message after a short delay to let the page update
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
          ...(selectedAssistant ? { assistantId: selectedAssistant.id } : {}),
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

                  // Update total tokens for context tracking
                  setTotalTokens((prev) => prev + data.tokensInput + data.tokensOutput);

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

  // TTS handlers
  const handlePlayTts = useCallback(async (messageId: string, text: string) => {
    try {
      // Initialize player if needed
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = createAudioPlayer();
        audioPlayerRef.current.onStateChange((state) => {
          if (state === "idle") {
            setPlayingMessageId(null);
            setTtsLoadingMessageId(null);
          }
        });
      }

      setTtsLoadingMessageId(messageId);

      const response = await fetch("/api/audio/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setPlayingMessageId(messageId);
      setTtsLoadingMessageId(null);

      await audioPlayerRef.current.play(url);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("TTS error:", error);
      setPlayingMessageId(null);
      setTtsLoadingMessageId(null);
    }
  }, []);

  const handleStopTts = useCallback(() => {
    audioPlayerRef.current?.stop();
    setPlayingMessageId(null);
    setTtsLoadingMessageId(null);
  }, []);

  // Cleanup audio player on unmount
  useEffect(() => {
    return () => {
      audioPlayerRef.current?.destroy();
    };
  }, []);

  // Helper to get TTS state for a message
  const getTtsState = useCallback((messageId: string): TtsState => {
    if (ttsLoadingMessageId === messageId) return "loading";
    if (playingMessageId === messageId) return "playing";
    return "idle";
  }, [ttsLoadingMessageId, playingMessageId]);

  // Handle familia assistant selection
  const handleSelectFamiliaAssistant = (assistant: CustomAssistant) => {
    const theme = getThemeColor(assistant.color);
    setSelectedAssistant({
      id: assistant.id,
      name: assistant.name,
      avatar: assistant.avatar,
      color: theme?.hex || "#3B82F6",
    });
  };

  const handleFamiliaAssistantCreated = (assistant: CustomAssistant) => {
    setFamiliaAssistants((prev) => [...prev, assistant]);
  };

  return (
    <div
      className="flex h-screen"
      style={familiaMode ? applyAccentColor(familiaAccentColor || "blue") : undefined}
    >
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
        familiaMode={familiaMode ? {
          accentColor: familiaAccentColor,
          userName: familiaMode.userName,
          supervisionMode: familiaMode.supervisionMode,
          dailyCreditLimit: familiaMode.dailyCreditLimit,
          dailyCreditsUsed: familiaMode.dailyCreditsUsed,
          cumulativeCredits: familiaMode.cumulativeCredits,
          weeklyCreditsUsed: familiaMode.weeklyCreditsUsed,
          creditsAllocated: familiaMode.creditsAllocated,
        } : undefined}
        onAccentColorChange={familiaMode ? setFamiliaAccentColor : undefined}
        familiaParentMode={familiaParentMode}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="lg:hidden w-10" /> {/* Spacer for mobile menu */}
          <div className="flex items-center gap-3">
            {selectedAssistant && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border"
                style={{ borderColor: selectedAssistant.color, backgroundColor: `${selectedAssistant.color}15` }}>
                <span>{selectedAssistant.avatar}</span>
                <span>{selectedAssistant.name}</span>
              </div>
            )}
            {!familiaMode && !familiaParentMode && (
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
            )}
            {/* Extended Thinking Toggle (Claude) - hidden for familia */}
            {!familiaMode && !familiaParentMode && claudeSupportsThinking && (
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
            {/* Reasoning indicator (OpenAI o1/o3 - always on) - hidden for familia */}
            {!familiaMode && !familiaParentMode && isOpenAIReasoning && (
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
            familiaMode && !selectedAssistant ? (
              <FamiliaWelcome
                userName={familiaMode.userName}
                assistants={familiaAssistants}
                accentColor={familiaAccentColor}
                onSelectAssistant={handleSelectFamiliaAssistant}
                onAssistantCreated={handleFamiliaAssistantCreated}
              />
            ) : familiaParentMode ? (
              <FamiliaParentWelcome
                orgName={familiaParentMode.orgName}
                onSendMessage={handleSendMessage}
              />
            ) : showModelPicker ? (
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
            ) : familiaMode && selectedAssistant ? (
              // Familia: Assistant selected, show personalized empty state
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-lg"
                  style={{
                    backgroundColor: `${selectedAssistant.color}20`,
                    border: `2px solid ${selectedAssistant.color}40`
                  }}
                >
                  <span className="text-5xl">{selectedAssistant.avatar}</span>
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: selectedAssistant.color }}>
                  {selectedAssistant.name}
                </h1>
                <p className="text-[var(--muted-foreground)] max-w-md mb-6">
                  {t("familia.assistantReady", { name: familiaMode.userName })}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("familia.startTyping")}
                </p>
              </div>
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
                <Message
                  key={message.id}
                  message={message}
                  ttsState={getTtsState(message.id)}
                  onPlayTts={handlePlayTts}
                  onStopTts={handleStopTts}
                />
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
          disabled={balance <= 0 || showModelPicker}
          rateLimit={rateLimit}
          rateLimitError={rateLimitError}
          conversationId={currentConversationId}
          pricingData={pricingData}
          accentColor={familiaMode ? (getThemeColor(familiaAccentColor || "blue")?.hex) : undefined}
          familiaMode={!!familiaMode}
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
