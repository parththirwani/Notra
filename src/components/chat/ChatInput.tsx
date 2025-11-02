"use client";

import { useState, useRef } from "react";
import { Send, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import Image from "next/image";

interface ChatInputProps {
  onSendMessage: (message: string, image?: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setSelectedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if ((message.trim() || selectedImage) && !disabled) {
      onSendMessage(message.trim(), selectedImage || undefined);
      setMessage("");
      removeImage();
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
      {/* Image Preview */}
      {imagePreview && (
        <div className="max-w-2xl mx-auto mb-2 px-4">
          <div className="relative inline-block">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-500">
              <Image
                src={imagePreview}
                alt="Upload preview"
                fill
                className="object-cover"
              />
            </div>
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              aria-label="Remove image"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-2 rounded-full 
        bg-gray-100 dark:bg-[#1f1f1f] 
        px-4 h-12 max-w-2xl mx-auto transition-colors"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          disabled={disabled}
        />

        {/* Image upload button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          title="Upload image"
        >
          <ImageIcon size={18} />
        </Button>

        {/* Input */}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedImage ? "Describe what you want to know about the image..." : "Ask anything"}
          disabled={disabled}
          className="flex-1 
          resize-none text-sm placeholder-gray-500 dark:placeholder-gray-400 
          text-gray-900 dark:text-gray-100 leading-tight py-2"
          rows={1}
        />

        {/* Send button */}
        <Button
          onClick={handleSubmit}
          disabled={(!message.trim() && !selectedImage) || disabled}
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