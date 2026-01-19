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
import { Sparkles } from "lucide-react";

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

interface ChatClientProps {
  userId: string;
  initialBalance: number;
  personalBalance?: number;
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

  // Get default model (recommended or first)
  const defaultModel = pricingData.models.find((m) => m.is_recommended)?.id ||
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
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
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
        }),
      });

      const data = await response.json();

      // Handle rate limit error specially
      if (response.status === 429) {
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
        throw new Error(data.error || tErrors("sendError"));
      }

      // Update rate limit from response
      if (data.rateLimit) {
        setRateLimit({
          remaining: data.rateLimit.remaining,
          limit: data.rateLimit.limit,
          tier: data.rateLimit.tier,
        });
      }

      // Update assistant message with response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: data.content,
                cost: data.cost,
                co2Grams: data.co2Grams,
                tokens: {
                  input: data.tokensInput,
                  output: data.tokensOutput,
                },
                isStreaming: false,
              }
            : m
        )
      );

      // Update balance
      setBalance((prev) => prev - data.cost);

      // Update conversation ID if new
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
        // Add to conversations list
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
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="lg:hidden w-10" /> {/* Spacer for mobile menu */}
          <ModelSelector
            value={model}
            onChange={setModel}
            models={pricingData.models}
            markupMultiplier={pricingData.settings.markupMultiplier}
          />
          <div className="text-sm text-[var(--muted-foreground)]">
            {t("sidebar.balance")}: <span className="font-medium">{balance.toFixed(2)}€</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
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
          disabled={balance <= 0}
          rateLimit={rateLimit}
          rateLimitError={rateLimitError}
          conversationId={currentConversationId}
          pricingData={pricingData}
        />
      </main>
    </div>
  );
}
