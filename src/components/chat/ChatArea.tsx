"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MessageRole } from "@prisma/client";
import { Message } from "./types";
import { cn } from "@/lib/utils";
import MarkdownMessage from "./MarkdownMessage";
import InteractiveMessage from "./InteractiveMessage";

interface ChatAreaProps {
  messages: Message[];
}

function formatLocalTimestamp(timestamp?: string): string {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

const ChatArea = ({ messages }: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col gap-5 p-5 md:p-6">
      {messages.map((message) => {
        const isUser = message.role === MessageRole.user;

        return (
          <div
            key={message.id}
            className={cn(
              "flex w-full",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "group relative max-w-[min(75%,36rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-shadow",
                "whitespace-normal break-words",
                isUser
                  ? "bg-blue-600 text-white shadow-blue-600/10"
                  : "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-100"
              )}
            >
              {message.image && (
                <div className="mb-3 overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
                  <div className="relative h-48 w-full">
                    <Image
                      src={message.image}
                      alt="Uploaded image"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "markdown-body",
                  isUser &&
                    "[&_*]:text-white [&_code]:bg-white/20 [&_pre]:bg-white/10 [&_a]:text-blue-100 [&_a:hover]:text-white"
                )}
              >
                {isUser ? (
                  <MarkdownMessage
                    content={message.content || ""}
                    isDark={false}
                  />
                ) : (
                  <InteractiveMessage content={message.content} />
                )}
              </div>

              {message.timestamp && (
                <div
                  className={cn(
                    "mt-2 text-right text-[11px] tabular-nums tracking-tight",
                    isUser
                      ? "text-blue-100/80"
                      : "text-gray-500 dark:text-zinc-400"
                  )}
                >
                  {formatLocalTimestamp(message.timestamp)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  );
};

export default ChatArea;
