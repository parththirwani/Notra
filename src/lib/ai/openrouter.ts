import { MODEL } from "@/types/chat";
import { MessageRole } from "@prisma/client";

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

export async function createCompletion(
  messages: { role: MessageRole; content: string; image?: string }[],
  model: MODEL,
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!process.env.OPENROUTER_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const openRouterMessages: OpenRouterMessage[] = messages.map((msg) => {
    // If message has an image, use multimodal content format
    if (msg.image) {
      const content: (TextContent | ImageContent)[] = [];

      // Add text if present
      if (msg.content) {
        content.push({
          type: "text",
          text: msg.content,
        });
      }

      // Add image
      content.push({
        type: "image_url",
        image_url: {
          url: msg.image,
        },
      });

      return {
        role: msg.role as OpenRouterRole,
        content,
      };
    }

    // Standard text-only message
    return {
      role: msg.role as OpenRouterRole,
      content: msg.content,
    };
  });

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: openRouterMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error:", response.status, errorText);
    throw new Error(`OpenRouter API error ${response.status}`);
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

export async function createCompletionOnce(
  messages: { role: MessageRole; content: string; image?: string }[],
  model: MODEL
): Promise<string> {
  if (!process.env.OPENROUTER_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const openRouterMessages: OpenRouterMessage[] = messages.map((msg) => {
    // If message has an image, use multimodal content format
    if (msg.image) {
      const content: (TextContent | ImageContent)[] = [];

      // Add text if present
      if (msg.content) {
        content.push({
          type: "text",
          text: msg.content,
        });
      }

      // Add image
      content.push({
        type: "image_url",
        image_url: {
          url: msg.image,
        },
      });

      return {
        role: msg.role as OpenRouterRole,
        content,
      };
    }

    // Standard text-only message
    return {
      role: msg.role as OpenRouterRole,
      content: msg.content,
    };
  });

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: openRouterMessages,
        stream: false,
        temperature: 0.5,
        max_tokens: 2000,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error:", response.status, errorText);
    throw new Error(`OpenRouter API error ${response.status}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  return content;
}