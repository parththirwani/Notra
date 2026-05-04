"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "@/components/chat/types";

export interface ConversationMeta {
  id: string;
  title: string;
  isActive: boolean;
}

const API_BASE = "/api/chat";

interface MessageWithTimestamp extends Message {
  createdAt?: string;
}

/**
 * Manages the list of conversations and the messages within them.
 * Separates data-fetching concerns from the ChatPage rendering logic.
 */
export function useConversations() {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(API_BASE, { method: "GET" });
        if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`);
        const data = await res.json();

        const raw: Array<{
          id: string;
          title: string;
          createdAt: string;
          messages: MessageWithTimestamp[];
        }> = data.conversations ?? [];

        if (cancelled) return;

        setConversations(
          raw.map((c) => ({ id: c.id, title: c.title ?? "Untitled", isActive: false }))
        );

        const msgs: Record<string, Message[]> = {};
        for (const c of raw) {
          msgs[c.id] = (c.messages ?? []).map((m, idx) => ({
            id: m.id ?? String(idx),
            content: m.content,
            role: m.role,
            timestamp:
              typeof m.timestamp === "string"
                ? m.timestamp
                : m.createdAt
                ? new Date(m.createdAt).toISOString()
                : undefined,
            image: m.image,
          }));
        }
        setMessagesByConversation(msgs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const addConversation = useCallback((meta: Omit<ConversationMeta, "isActive">) => {
    setConversations((prev) => [
      { ...meta, isActive: true },
      ...prev.map((c) => ({ ...c, isActive: false })),
    ]);
    setMessagesByConversation((prev) => ({ ...prev, [meta.id]: [] }));
  }, []);

  const removeConversation = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    } finally {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setMessagesByConversation((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, []);

  const appendMessage = useCallback((conversationId: string, message: Message) => {
    setMessagesByConversation((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), message],
    }));
  }, []);

  const updateLastAssistantMessage = useCallback(
    (conversationId: string, content: string, role: Message["role"]) => {
      setMessagesByConversation((prev) => {
        const list = prev[conversationId] ?? [];
        const last = list[list.length - 1];
        if (last && last.role === role) {
          const updated = [...list];
          updated[updated.length - 1] = { ...last, content };
          return { ...prev, [conversationId]: updated };
        }
        return {
          ...prev,
          [conversationId]: [
            ...list,
            {
              id: `${Date.now()}-asst`,
              content,
              role,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      });
    },
    []
  );

  return {
    conversations,
    setConversations,
    messagesByConversation,
    loading,
    error,
    addConversation,
    removeConversation,
    appendMessage,
    updateLastAssistantMessage,
  };
}