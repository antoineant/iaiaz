"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/types";
import {
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  CreditCard,
  Menu,
  X,
  Trash2,
} from "lucide-react";

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  balance: number;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function Sidebar({
  conversations,
  currentConversationId,
  balance,
  onNewConversation,
  onDeleteConversation,
}: SidebarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(id);
    await onDeleteConversation(id);
    setDeletingId(null);
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <Link href="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400">
          iaiaz
        </Link>
      </div>

      {/* Balance */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--muted-foreground)]">Solde</span>
          <span className="font-semibold">{formatCurrency(balance)}</span>
        </div>
        <Link href="/dashboard/credits">
          <Button variant="outline" size="sm" className="w-full mt-2">
            <CreditCard className="w-4 h-4 mr-2" />
            Recharger
          </Button>
        </Link>
      </div>

      {/* New conversation */}
      <div className="p-4">
        <Button className="w-full" onClick={onNewConversation}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle conversation
        </Button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-semibold text-[var(--muted-foreground)] px-2 py-2">
          Conversations récentes
        </div>
        {conversations.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] px-2 py-4 text-center">
            Aucune conversation
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <Link
                  href={`/chat/${conv.id}`}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors group",
                    currentConversationId === conv.id
                      ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                      : "hover:bg-[var(--muted)]"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">
                    {conv.title || "Nouvelle conversation"}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className={cn(
                      "p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all",
                      deletingId === conv.id && "opacity-100"
                    )}
                    disabled={deletingId === conv.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <Settings className="w-4 h-4" />
          Tableau de bord
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] shadow-sm"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[var(--background)] border-r border-[var(--border)] flex flex-col",
          "transform transition-transform lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
