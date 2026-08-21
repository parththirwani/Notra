/**
 * src/lib/ai/embeddings.ts
 *
 * Embeds text using OpenAI text-embedding-3-small via the active AI provider
 * (OpenRouter or LiteLLM). Returns a 1536-dim float vector.
 */

import { getProviderConfig } from "@/lib/ai/provider";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";

export async function embedText(text: string): Promise<number[]> {
  const { baseUrl, headers } = getProviderConfig();

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 512), // keep it cheap — topic labels are short
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embeddings API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const embedding: number[] = data?.data?.[0]?.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Invalid embedding response");
  }

  return embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}