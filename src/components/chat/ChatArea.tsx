"use client";
import { Message } from "./types";
import { cn } from "@/lib/utils";

interface ChatAreaProps {
  messages: Message[];
}

const ChatArea = ({ messages }: ChatAreaProps) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex",
            message.isUser ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              // 👇 fixed here
              "rounded-2xl px-4 py-2 text-sm shadow-md max-w-[75%] break-words break-all overflow-wrap-anywhere whitespace-pre-wrap",
              message.isUser
                ? "bg-blue-500 text-white self-end"
                : "bg-gray-200 text-gray-900 self-start dark:bg-[#2a2a2a] dark:text-white"
            )}
          >
            {message.content}
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
              {message.timestamp}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatArea;
