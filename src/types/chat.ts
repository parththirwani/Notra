import { Role } from "@prisma/client";
import { z } from "zod"

const MAX_INPUT_TOKENS = 1000;

export const SUPPORTED_MODELS = [
  "deepseek/deepseek-chat-v3.1",
  "google/gemini-2.5-flash",
  "openai/gpt-4o"
] as const;

export type MODEL = typeof SUPPORTED_MODELS[number];

export const CreateChatSchema = z.object({
    conversationId: z.string().uuid(),
    message: z.string().trim().min(1).max(MAX_INPUT_TOKENS),
    model: z.enum(SUPPORTED_MODELS)
});

export const CreateNewChatSchema = z.object({
    message: z.string().trim().min(1).max(MAX_INPUT_TOKENS),
    model: z.enum(SUPPORTED_MODELS)
});

export type Message = {
    content: string,
    role: Role
}

export type Messages = Message[];

