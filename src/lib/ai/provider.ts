/**
 * src/lib/ai/provider.ts
 *
 * Resolves the active AI provider (OpenRouter or LiteLLM) from env vars.
 * Both providers expose an OpenAI-compatible API, so only the base URL,
 * API key, and auth headers differ.
 */

export type AIProvider = "openrouter" | "litellm";

interface ProviderConfig {
  provider: AIProvider;
  baseUrl: string;
  headers: Record<string, string>;
}

export function getProviderConfig(): ProviderConfig {
  const provider = (process.env.AI_PROVIDER as AIProvider) || "openrouter";

  if (provider === "litellm") {
    const apiKey = process.env.LITELLM_KEY;
    if (!apiKey) throw new Error("LITELLM_KEY is not set");

    const baseUrl = (
      process.env.LITELLM_BASE_URL || "http://localhost:4000"
    ).replace(/\/+$/, "");

    return {
      provider,
      baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };
  }

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) throw new Error("OPENROUTER_KEY is not set");

  return {
    provider,
    baseUrl: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "Notra",
    },
  };
}
