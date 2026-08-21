/**
 * Notra Title Service
 *
 * Generates a short, semantic conversation title from the first user message
 * by calling an LLM — similar to how Claude.ai and ChatGPT name chats.
 *
 * Place this file at: src/lib/ai/titleService.ts
 */

import { getProviderConfig } from "@/lib/ai/provider";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TITLE_MODEL = "openai/gpt-4o";
const MAX_TITLE_LENGTH = 60;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const TITLE_SYSTEM_PROMPT = `You are a concise title generator for a STEM study chat application.

Your task: given the user's first message, produce a SHORT, descriptive title (2–6 words) for the conversation.

Rules:
- Return ONLY the title — no quotes, no punctuation at the end, no explanation.
- Capture the core intent/topic, not the literal words.
- Use sentence case (capitalise only the first word and proper nouns).
- If the message is a greeting ("hi", "hello", "hey", etc.) → respond: Greeting
- If the message is a casual question with no subject → respond: Quick question
- If the message involves an image with no text → respond: Image analysis
- Never exceed 6 words.
- Never start with "A" or "The" unless absolutely necessary.
- Examples:
    "Can you explain Newton's second law?" → Newton's second law
    "Help me solve this integral: ∫x² dx" → Integral of x squared
    "What is the difference between mitosis and meiosis?" → Mitosis vs meiosis
    "Write a Python function to sort a list" → Python list sorting
    "hi there!" → Greeting
    "Can you quiz me on thermodynamics?" → Thermodynamics quiz
    "Summarise my uploaded notes" → Notes summary`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calls the LLM to generate a semantic chat title.
 * Falls back to the truncated first message if anything goes wrong.
 */
export async function generateChatTitle(
  message: string,
  hasImage: boolean
): Promise<string> {
  const trimmedMessage = message.trim();

  let userContent = trimmedMessage;
  if (hasImage && !trimmedMessage) {
    userContent = "[User uploaded an image with no text]";
  } else if (hasImage) {
    userContent = `[User uploaded an image] ${trimmedMessage}`;
  }

  try {
    return await callLLMForTitle(userContent);
  } catch (err) {
    console.error("[TitleService] LLM call failed, using fallback:", err);
    return fallbackTitle(trimmedMessage, hasImage);
  }
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

async function callLLMForTitle(userContent: string): Promise<string> {
  const { baseUrl, headers } = getProviderConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: TITLE_MODEL,
      messages: [
        { role: "system", content: TITLE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      stream: false,
      temperature: 0.3,
      max_tokens: 20,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI provider API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";

  return sanitizeTitle(raw);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeTitle(raw: string): string {
  let title = raw
    .trim()
    .replace(/^["'`«»]|["'`«»]$/g, "")
    .replace(/[.:;!?]+$/, "")
    .trim();

  if (!title) return "New conversation";

  if (title.length > MAX_TITLE_LENGTH) {
    title = title.slice(0, MAX_TITLE_LENGTH - 1).trimEnd() + "…";
  }

  return title;
}

function fallbackTitle(message: string, hasImage: boolean): string {
  if (hasImage && !message) return "Image analysis";

  if (/^(hi+|hello+|hey+|howdy|greetings|sup|what'?s up)[!?,.]?\s*$/i.test(message)) {
    return "Greeting";
  }

  const base = hasImage ? `Image: ${message}` : message;
  if (base.length <= MAX_TITLE_LENGTH) return base;
  return base.slice(0, MAX_TITLE_LENGTH - 1).trimEnd() + "…";
}