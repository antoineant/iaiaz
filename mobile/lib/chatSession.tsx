import { createContext, useContext, useState, useCallback } from "react";

interface ChatSession {
  conversationId: string;
  assistantId?: string;
  assistantName?: string;
  assistantAvatar?: string;
}

interface ChatSessionContextValue {
  session: ChatSession | null;
  startSession: (session: ChatSession) => void;
  clearSession: () => void;
}

const ChatSessionContext = createContext<ChatSessionContextValue>({
  session: null,
  startSession: () => {},
  clearSession: () => {},
});

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ChatSession | null>(null);

  const startSession = useCallback((s: ChatSession) => setSession(s), []);
  const clearSession = useCallback(() => setSession(null), []);

  return (
    <ChatSessionContext.Provider value={{ session, startSession, clearSession }}>
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSession() {
  return useContext(ChatSessionContext);
}
