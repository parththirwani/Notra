import { MessageRole } from "@prisma/client";
import { z } from "zod";

/** Maximum characters allowed in a single user message. */
const MAX_INPUT_TOKENS = 4000;

export const SUPPORTED_MODELS = [
  "deepseek/deepseek-chat-v3.1",
  "google/gemini-2.5-flash",
  "openai/gpt-4o",
] as const;

export type MODEL = (typeof SUPPORTED_MODELS)[number];

export const CreateChatSchema = z.object({
  message: z.string().trim().min(1).max(MAX_INPUT_TOKENS),
  model: z.enum(SUPPORTED_MODELS),
});

export interface Message {
  id?: string;
  content: string;
  role: MessageRole;
  timestamp?: string;
  /** base64 data URL for image uploads */
  image?: string;
}

export type Messages = Message[];

/** Metadata about each supported model shown in the UI. */
export interface ModelMeta {
  label: string;
  provider: string;
  description: string;
  maxContextTokens: number;
}

export const MODEL_META: Record<MODEL, ModelMeta> = {
  "openai/gpt-4o": {
    label: "GPT-4o",
    provider: "OpenAI",
    description: "Best for complex reasoning and coding",
    maxContextTokens: 128_000,
  },
  "google/gemini-2.5-flash": {
    label: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Fast and efficient for most tasks",
    maxContextTokens: 1_000_000,
  },
  "deepseek/deepseek-chat-v3.1": {
    label: "DeepSeek Chat v3",
    provider: "DeepSeek",
    description: "Strong math and science reasoning",
    maxContextTokens: 64_000,
  },
};