import { MODEL } from "@/types/chat";
import { MessageRole } from "@prisma/client";

type OpenRouterRole = "system" | "user" | "assistant";

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image_url";
  image_url: { url: string };
}

type MessageContent = string | (TextContent | ImageContent)[];

interface OpenRouterMessage {
  role: OpenRouterRole;
  content: MessageContent;
}

interface OpenRouterChatCompletionRequest {
  model: string;
  messages: OpenRouterMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
  [key: string]: unknown;
}

// ── Structured output schemas ────────────────────────────────────────────────

const MCQ_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["mcq"] },
    question: { type: "string" },
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          correct: { type: "boolean" },
        },
        required: ["text", "correct"],
        additionalProperties: false,
      },
      minItems: 4,
      maxItems: 4,
    },
  },
  required: ["type", "question", "options"],
  additionalProperties: false,
} as const;

const FLASHCARD_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["flashcard"] },
    front: { type: "string" },
    back: { type: "string" },
  },
  required: ["type", "front", "back"],
  additionalProperties: false,
} as const;

const QUIZ_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["quiz"] },
    title: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                correct: { type: "boolean" },
              },
              required: ["text", "correct"],
              additionalProperties: false,
            },
            minItems: 4,
            maxItems: 4,
          },
        },
        required: ["question", "options"],
        additionalProperties: false,
      },
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ["type", "title", "questions"],
  additionalProperties: false,
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

function buildMessages(
  messages: { role: MessageRole; content: string; image?: string }[]
): OpenRouterMessage[] {
  return messages.map((msg) => {
    if (msg.image) {
      const content: (TextContent | ImageContent)[] = [];
      if (msg.content) content.push({ type: "text", text: msg.content });
      content.push({ type: "image_url", image_url: { url: msg.image } });
      return { role: msg.role as OpenRouterRole, content };
    }
    return { role: msg.role as OpenRouterRole, content: msg.content };
  });
}

function selectSchema(responseFormat?: "mcq" | "flashcard" | "quiz") {
  if (responseFormat === "mcq") return MCQ_SCHEMA;
  if (responseFormat === "flashcard") return FLASHCARD_SCHEMA;
  if (responseFormat === "quiz") return QUIZ_SCHEMA;
  return undefined;
}

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_KEY;
  if (!key) throw new Error("OPENROUTER_KEY environment variable is not set");
  return key;
}

function buildRequestBody(
  messages: OpenRouterMessage[],
  model: MODEL,
  stream: boolean,
  responseFormat?: "mcq" | "flashcard" | "quiz"
): OpenRouterChatCompletionRequest {
  const schema = selectSchema(responseFormat);
  const body: OpenRouterChatCompletionRequest = {
    model,
    messages,
    stream,
    temperature: stream ? 0.7 : 0.5,
    max_tokens: 2000,
  };
  if (schema && responseFormat) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: responseFormat, strict: true, schema },
    };
  }
  return body;
}

async function fetchOpenRouter(
  body: OpenRouterChatCompletionRequest
): Promise<Response> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenRouterKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "Notra",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error:", response.status, errorText);
    throw new OpenRouterError(
      `OpenRouter API error ${response.status}`,
      response.status,
      errorText
    );
  }

  return response;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Stream a chat completion, calling `onChunk` for every text delta received.
 */
export async function createCompletion(
  messages: { role: MessageRole; content: string; image?: string }[],
  model: MODEL,
  onChunk: (chunk: string) => void,
  responseFormat?: "mcq" | "flashcard" | "quiz"
): Promise<void> {
  const openRouterMessages = buildMessages(messages);
  const requestBody = buildRequestBody(
    openRouterMessages,
    model,
    true,
    responseFormat
  );

  const response = await fetchOpenRouter(requestBody);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {
          // Ignore malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Request a single (non-streaming) chat completion and return the full text.
 */
export async function createCompletionOnce(
  messages: { role: MessageRole; content: string; image?: string }[],
  model: MODEL,
  responseFormat?: "mcq" | "flashcard" | "quiz"
): Promise<string> {
  const openRouterMessages = buildMessages(messages);
  const requestBody = buildRequestBody(
    openRouterMessages,
    model,
    false,
    responseFormat
  );

  const response = await fetchOpenRouter(requestBody);
  const data = await response.json();
  return (data.choices?.[0]?.message?.content as string) ?? "";
}