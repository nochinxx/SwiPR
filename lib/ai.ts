import { createOpenAI } from "@ai-sdk/openai";

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
