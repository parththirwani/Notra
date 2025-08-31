"use client";

import { useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-3 bg-transparent">
      <div
        className="flex items-center gap-2 rounded-full 
        bg-gray-100 dark:bg-[#1f1f1f] 
        px-4 h-12 max-w-2xl mx-auto transition-colors"
      >
        {/* Left icon */}
        <Paperclip
          size={18}
          className="text-gray-500 dark:text-gray-400"
        />

        {/* Input */}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything"
          disabled={disabled}
          className="flex-1 
          resize-none text-sm placeholder-gray-500 dark:placeholder-gray-400 
          text-gray-900 dark:text-gray-100 leading-tight py-2"
          rows={1}
        />

        {/* Right icon (send) */}
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white flex items-center justify-center"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
