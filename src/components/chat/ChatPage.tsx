"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ChatSidebar from "./ChatSidebar";
import ChatArea from "./ChatArea";
import ChatInput from "./ChatInput";
import NotesModal from "./NotesModal";
import { ThemeToggle } from "../ui/themeToggle";
import { Button } from "../ui/button";
import { Message } from "./types";
import { MessageRole } from "@prisma/client";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Subject = {
  id: string;
  title: string;
  isActive: boolean;
};

interface MessageWithTimestamp extends Message {
  createdAt?: string;
}

interface ConversationPayload {
  id: string;
  title: string;
  createdAt: string;
  messages: MessageWithTimestamp[];
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const API_BASE = "/api/chat";
const DEFAULT_MODEL = "openai/gpt-4o";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function createMessage(
  content: string,
  role: MessageRole,
  image?: string
): Message {
  return {
    id: `${Date.now()}-${role}`,
    content,
    role,
    timestamp: new Date().toISOString(),
    image,
  };
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const ChatPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubjectId, setCurrentSubjectId] = useState<string | null>(null);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  const controllerRef = useRef<AbortController | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Initial data fetch                                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadConversations = async () => {
      try {
        const res = await fetch(API_BASE, { method: "GET" });
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const conversations: ConversationPayload[] = data.conversations ?? [];

        const normalizedSubjects: Subject[] = conversations.map((c) => ({
          id: c.id,
          title: c.title ?? "Untitled",
          isActive: false,
        }));

        const normalizedMessages: Record<string, Message[]> = {};
        for (const c of conversations) {
          normalizedMessages[c.id] = (c.messages ?? []).map((m, idx) => ({
            id: m.id ?? `${idx}`,
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

        if (cancelled) return;

        setSubjects(normalizedSubjects);
        setMessagesByConversation(normalizedMessages);

        if (normalizedSubjects.length > 0) {
          setCurrentSubjectId(normalizedSubjects[0].id);
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        if (!cancelled) setIsLoadingConversations(false);
      }
    };

    loadConversations();

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Subject / conversation management                                      */
  /* ---------------------------------------------------------------------- */

  const handleSubjectSelect = useCallback((id: string) => {
    setSubjects((prev) =>
      prev.map((s) => ({ ...s, isActive: s.id === id }))
    );
    setCurrentSubjectId(id);
  }, []);

  const handleNewSubject = useCallback(() => {
    setSubjects((prev) => prev.map((s) => ({ ...s, isActive: false })));
    setCurrentSubjectId(null);
  }, []);

  const deleteById = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    } finally {
      setSubjects((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        // If the deleted conversation was active, switch to the first remaining one
        setCurrentSubjectId((current) =>
          current === id ? remaining[0]?.id ?? null : current
        );
        return remaining;
      });

      setMessagesByConversation((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Message helpers                                                        */
  /* ---------------------------------------------------------------------- */

  const appendMessage = useCallback(
    (conversationId: string, message: Message) => {
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), message],
      }));
    },
    []
  );

  const updateAssistantMessage = useCallback(
    (conversationId: string, content: string) => {
      setMessagesByConversation((prev) => {
        const list = prev[conversationId] ?? [];
        const last = list[list.length - 1];

        if (last?.role === MessageRole.assistant) {
          const updated = [...list];
          updated[updated.length - 1] = { ...last, content };
          return { ...prev, [conversationId]: updated };
        }

        return {
          ...prev,
          [conversationId]: [
            ...list,
            createMessage(content, MessageRole.assistant),
          ],
        };
      });
    },
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Streaming                                                              */
  /* ---------------------------------------------------------------------- */

  const streamResponse = useCallback(
    async (
      response: Response,
      onChunk: (chunk: string) => void
    ): Promise<void> => {
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let index: number;
          while ((index = buffer.indexOf("\n\n")) !== -1) {
            const sse = buffer.slice(0, index);
            buffer = buffer.slice(index + 2);

            if (!sse.startsWith("data:")) continue;

            let payload = sse.slice(5).trimStart();
            if (payload === "[DONE]") return;

            onChunk(payload);
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Send message                                                           */
  /* ---------------------------------------------------------------------- */

  const handleSendMessage = useCallback(
    async (content: string, image?: string) => {
      // Abort any in-flight request
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setIsStreaming(true);

      try {
        // ----- New conversation -----
        if (!currentSubjectId) {
          const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: content,
              model: DEFAULT_MODEL,
              image,
            }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            throw new Error(`Request failed: ${res.status}`);
          }

          let conversationId: string | null = null;
          let assistantBuffer = "";

          await streamResponse(res, (payload) => {
            // First chunk is expected to be metadata
            if (!conversationId && payload.startsWith("{")) {
              try {
                const meta = JSON.parse(payload) as {
                  conversationId: string;
                  title: string;
                };

                conversationId = meta.conversationId;

                setSubjects((prev) => [
                  {
                    id: meta.conversationId,
                    title: meta.title,
                    isActive: true,
                  },
                  ...prev.map((s) => ({ ...s, isActive: false })),
                ]);
                setCurrentSubjectId(meta.conversationId);
                setMessagesByConversation((prev) => ({
                  ...prev,
                  [meta.conversationId]: [],
                }));

                appendMessage(
                  meta.conversationId,
                  createMessage(content, MessageRole.user, image)
                );
                return;
              } catch {
                // Fall through – treat as normal content
              }
            }

            assistantBuffer += payload;
            if (conversationId) {
              updateAssistantMessage(conversationId, assistantBuffer);
            }
          });

          return;
        }

        // ----- Existing conversation -----
        const conversationId = currentSubjectId;

        appendMessage(
          conversationId,
          createMessage(content, MessageRole.user, image)
        );

        const res = await fetch(`${API_BASE}/${conversationId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            model: DEFAULT_MODEL,
            image,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Request failed: ${res.status}`);
        }

        let assistantBuffer = "";

        await streamResponse(res, (payload) => {
          assistantBuffer += payload;
          updateAssistantMessage(conversationId, assistantBuffer);
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to send message:", err);
          // Optional: surface a toast / error state to the user here
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [
      appendMessage,
      currentSubjectId,
      streamResponse,
      updateAssistantMessage,
    ]
  );

  /* ---------------------------------------------------------------------- */
  /* Derived state                                                          */
  /* ---------------------------------------------------------------------- */

  const currentMessages = useMemo(
    () =>
      currentSubjectId
        ? (messagesByConversation[currentSubjectId] ?? [])
        : [],
    [currentSubjectId, messagesByConversation]
  );

  const showBranding =
    !currentSubjectId || currentMessages.length === 0;

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="h-screen flex bg-white text-gray-900 dark:bg-[#121212] dark:text-white">
      <ChatSidebar
        subjects={subjects}
        onSubjectSelect={handleSubjectSelect}
        onNewSubject={handleNewSubject}
        onDeleteSubject={deleteById}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-2 flex items-center justify-end gap-2 border-b border-gray-200 dark:border-gray-700">
          {currentSubjectId && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setNotesOpen(true)}
            >
              Notes
            </Button>
          )}
          <ThemeToggle />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#121212]">
          {isLoadingConversations ? (
            <div className="h-full grid place-items-center text-sm opacity-60">
              Loading conversations…
            </div>
          ) : showBranding ? (
            <div className="h-full w-full grid place-items-center relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.3)_0,transparent_60%)]" />
              <div className="text-center select-none flex flex-col items-center px-4">
                <div className="relative w-24 h-24 mb-2 opacity-80">
                  <Image
                    src="/small-logo.png"
                    alt="Notra"
                    fill
                    sizes="96px"
                    style={{ objectFit: "contain" }}
                    priority
                  />
                </div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent tracking-tight">
                  Notra: Notes Ultra
                </h1>
                <p className="mt-2 text-md opacity-70 max-w-md">
                  Start a new conversation to get insights, answers, and code.
                </p>
              </div>
            </div>
          ) : (
            <ChatArea messages={currentMessages} />
          )}
        </div>

        <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
      </div>

      <NotesModal
        conversationId={currentSubjectId}
        open={notesOpen}
        onOpenChange={setNotesOpen}
      />
    </div>
  );
};

export default ChatPage;
