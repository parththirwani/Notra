"use client"
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
    <div className="p-4 border-t border-gray-300 bg-white dark:border-gray-700 dark:bg-[#121212]">
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            className="min-h-[50px] max-h-[120px] resize-none bg-gray-50 border-gray-300 focus:ring-2 focus:ring-blue-500/20 rounded-xl dark:bg-[#1f1f1f] dark:border-gray-600"
            rows={1}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 bottom-2 h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Paperclip size={16} />
          </Button>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className="h-[50px] w-[50px] p-0 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl"
        >
          <Send size={18} />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
