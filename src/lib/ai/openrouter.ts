import { MODEL } from "@/types/chat";
import { MessageRole } from "@prisma/client";

type OpenRouterRole = "system" | "user" | "assistant";

interface OpenRouterMessage {
  role: OpenRouterRole;
  content: string;
}

export async function createCompletion(
  messages: { role: MessageRole; content: string }[],
  model: MODEL,
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!process.env.OPENROUTER_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const openRouterMessages: OpenRouterMessage[] = messages.map(msg => ({
    role: msg.role as OpenRouterRole, 
    content: msg.content,
  }));

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
  });

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
