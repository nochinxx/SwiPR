import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

if (!process.env.AI_GATEWAY_API_KEY) {
  throw new Error(
    "AI_GATEWAY_API_KEY is not set. Generate one at https://vercel.com/ai-gateway"
  );
}

// AI Gateway speaks the OpenAI protocol; point @ai-sdk/openai at it.
export const gateway = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: "https://ai-gateway.vercel.sh/v1",
});

export const models = {
  /** Deep reasoning — PR analysis, chat. */
  sonnet: gateway("anthropic/claude-sonnet-4-6"),
  /** Fast + cheap — bulk tagging during ingest. */
  haiku: gateway("anthropic/claude-haiku-4-5"),
  /** Embeddings, 1536 dims. */
  embedding: gateway.embedding("openai/text-embedding-3-small"),
} as const;

/**
 * Returns a sonnet-class model for the given BYOK key.
 * Accepts an Anthropic API key (sk-ant-...) — falls back to the shared gateway.
 */
export function getModelForKey(byokKey?: string | null): LanguageModel {
  if (byokKey?.startsWith("sk-ant-")) {
    return createAnthropic({ apiKey: byokKey })("claude-sonnet-4-6");
  }
  return models.sonnet;
}
