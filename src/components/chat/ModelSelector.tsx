"use client";

import { useState } from "react";
import { MODEL, SUPPORTED_MODELS } from "@/types/chat";
import { ChevronDown, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

const MODEL_LABELS: Record<MODEL, { label: string; provider: string; description: string }> = {
  "openai/gpt-4o": {
    label: "GPT-4o",
    provider: "OpenAI",
    description: "Best for complex reasoning and coding",
  },
  "google/gemini-2.5-flash": {
    label: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Fast and efficient for most tasks",
  },
  "deepseek/deepseek-chat-v3.1": {
    label: "DeepSeek Chat v3",
    provider: "DeepSeek",
    description: "Strong math and science reasoning",
  },
};

interface ModelSelectorProps {
  value: MODEL;
  onChange: (model: MODEL) => void;
  disabled?: boolean;
}

const ModelSelector = ({ value, onChange, disabled }: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const current = MODEL_LABELS[value];

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
          "bg-gray-100 dark:bg-[#1f1f1f] hover:bg-gray-200 dark:hover:bg-[#2a2a2a]",
          "border border-gray-200 dark:border-gray-700",
          "text-gray-700 dark:text-gray-300",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Select AI model"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Cpu size={12} className="text-blue-500" />
        <span>{current.provider} · {current.label}</span>
        <ChevronDown
          size={12}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div
            role="listbox"
            className={cn(
              "absolute bottom-full mb-2 left-0 z-20 min-w-[260px]",
              "rounded-xl border border-gray-200 dark:border-gray-700",
              "bg-white dark:bg-[#1a1a1a] shadow-lg",
              "overflow-hidden"
            )}
          >
            <div className="p-2 text-[10px] uppercase tracking-wider text-gray-400 px-3 pt-3 pb-1">
              Select Model
            </div>
            {SUPPORTED_MODELS.map((model) => {
              const info = MODEL_LABELS[model];
              const isActive = model === value;
              return (
                <button
                  key={model}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(model);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{info.label}</span>
                    <span className="text-[10px] text-gray-400">{info.provider}</span>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {info.description}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSelector;