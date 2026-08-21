import { MODEL } from "@/types/chat";
import { MessageRole } from "@prisma/client";
import { getProviderConfig } from "@/lib/ai/provider";

type OpenRouterRole = "system" | "user" | "assistant";

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image_url";
  image_url: {
    url: string;
  };
}

type MessageContent = string | (TextContent | ImageContent)[];

interface OpenRouterMessage {
  role: OpenRouterRole;
  content: MessageContent;
}

// ──────────────────────────────────────────────
// Request type (replaces any)
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
  // Feel free to add more fields later (tools, stop, etc.)
  [key: string]: unknown;
}

// ──────────────────────────────────────────────
// Structured output schemas (unchanged)
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

// ──────────────────────────────────────────────
export async function createCompletion(
  messages: { role: MessageRole; content: string; image?: string }[],
  model: MODEL,
  onChunk: (chunk: string) => void,
  responseFormat?: "mcq" | "flashcard" | "quiz"
): Promise<void> {
  if (!process.env.OPENROUTER_KEY && !process.env.LITELLM_KEY) {
    throw new Error("No AI provider key is set (OPENROUTER_KEY or LITELLM_KEY)");
  }

  const openRouterMessages: OpenRouterMessage[] = messages.map((msg) => {
    if (msg.image) {
      const content: (TextContent | ImageContent)[] = [];
      if (msg.content) {
        content.push({ type: "text", text: msg.content });
      }
      content.push({
        type: "image_url",
        image_url: { url: msg.image },
      });
      return { role: msg.role as OpenRouterRole, content };
    }
    return {
      role: msg.role as OpenRouterRole,
      content: msg.content,
    };
  });

  // Select schema
  let responseSchema:
    | typeof MCQ_SCHEMA
    | typeof FLASHCARD_SCHEMA
    | typeof QUIZ_SCHEMA
    | undefined;

  if (responseFormat === "mcq") responseSchema = MCQ_SCHEMA;
  else if (responseFormat === "flashcard") responseSchema = FLASHCARD_SCHEMA;
  else if (responseFormat === "quiz") responseSchema = QUIZ_SCHEMA;

  const requestBody: OpenRouterChatCompletionRequest = {
    model,
    messages: openRouterMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 2000,
  };

  if (responseSchema && responseFormat) {
    requestBody.response_format = {
      type: "json_schema",
      json_schema: {
        name: responseFormat,
        strict: true,
        schema: responseSchema,
      },
    };
  }

  const { baseUrl, headers } = getProviderConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI provider API error:", response.status, errorText);
    throw new Error(`AI provider API error ${response.status}: ${errorText}`);
  }

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
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
          } catch {
            // ignore invalid chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ──────────────────────────────────────────────
export async function createCompletionOnce(
  messages: { role: MessageRole; content: string; image?: string }[],
  model: MODEL,
  responseFormat?: "mcq" | "flashcard" | "quiz"
): Promise<string> {
  if (!process.env.OPENROUTER_KEY && !process.env.LITELLM_KEY) {
    throw new Error("No AI provider key is set (OPENROUTER_KEY or LITELLM_KEY)");
  }

  const openRouterMessages: OpenRouterMessage[] = messages.map((msg) => {
    if (msg.image) {
      const content: (TextContent | ImageContent)[] = [];
      if (msg.content) {
        content.push({ type: "text", text: msg.content });
      }
      content.push({
        type: "image_url",
        image_url: { url: msg.image },
      });
      return { role: msg.role as OpenRouterRole, content };
    }
    return {
      role: msg.role as OpenRouterRole,
      content: msg.content,
    };
  });

  let responseSchema:
    | typeof MCQ_SCHEMA
    | typeof FLASHCARD_SCHEMA
    | typeof QUIZ_SCHEMA
    | undefined;

  if (responseFormat === "mcq") responseSchema = MCQ_SCHEMA;
  else if (responseFormat === "flashcard") responseSchema = FLASHCARD_SCHEMA;
  else if (responseFormat === "quiz") responseSchema = QUIZ_SCHEMA;

  const requestBody: OpenRouterChatCompletionRequest = {
    model,
    messages: openRouterMessages,
    stream: false,
    temperature: 0.5,
    max_tokens: 2000,
  };

  if (responseSchema && responseFormat) {
    requestBody.response_format = {
      type: "json_schema",
      json_schema: {
        name: responseFormat,
        strict: true,
        schema: responseSchema,
      },
    };
  }

  const { baseUrl, headers } = getProviderConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI provider API error:", response.status, errorText);
    throw new Error(`AI provider API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  return content;
}