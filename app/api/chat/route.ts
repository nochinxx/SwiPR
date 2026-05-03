/**
 * POST /api/chat
 *
 * AI SDK streaming chat with all 12 MCP tools registered as function tools.
 * Powers the "ask deeper" free-text input in the AI context panel.
 */

import { streamText } from "ai";
import { z } from "zod";
import { models } from "@/lib/ai";

export async function POST(req: Request) {
  const { messages, prId, repoId, sessionId } = await req.json();

  const result = streamText({
    model: models.sonnet,
    system: `You are a senior software engineer helping review a GitHub Pull Request.
You have deep context about the PR being reviewed. Answer questions concisely and precisely —
reviewers are busy. Lead with the most actionable insight. Use code references when relevant.

Current context: PR ID=${prId ?? "unknown"}, Repo ID=${repoId ?? "unknown"}, Session ID=${sessionId ?? "unknown"}`,
    messages,
    tools: {
      analyze_pr: {
        description: "Analyze a PR and return 3 concise bullets.",
        parameters: z.object({ pr_id: z.string().uuid() }),
        execute: async ({ pr_id }) => {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/mcp`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ method: "tools/call", params: { name: "analyze_pr", arguments: { pr_id } } }),
            }
          );
          return res.json();
        },
      },
      risk_score: {
        description: "Return a risk score (0-100) for a PR.",
        parameters: z.object({ pr_id: z.string().uuid(), verbose: z.boolean().optional() }),
        execute: async ({ pr_id, verbose }) => {
          const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/mcp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method: "tools/call", params: { name: "risk_score", arguments: { pr_id, verbose } } }),
          });
          return res.json();
        },
      },
      find_similar_changes: {
        description: "Find semantically similar past PRs in this repo.",
        parameters: z.object({ pr_id: z.string().uuid(), k: z.number().optional() }),
        execute: async ({ pr_id, k }) => {
          const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/mcp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method: "tools/call", params: { name: "find_similar_changes", arguments: { pr_id, k } } }),
          });
          return res.json();
        },
      },
      get_contributor_history: {
        description: "Get contribution history of a GitHub handle in this repo.",
        parameters: z.object({ handle: z.string(), repo_id: z.string().uuid() }),
        execute: async ({ handle, repo_id }) => {
          const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/mcp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method: "tools/call", params: { name: "get_contributor_history", arguments: { handle, repo_id } } }),
          });
          return res.json();
        },
      },
      inspect_file: {
        description: "Fetch and analyze a specific file from the repo.",
        parameters: z.object({ repo_id: z.string().uuid(), path: z.string(), question: z.string().optional() }),
        execute: async ({ repo_id, path, question }) => {
          const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/mcp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method: "tools/call", params: { name: "inspect_file", arguments: { repo_id, path, question } } }),
          });
          return res.json();
        },
      },
      find_callers: {
        description: "Find usages of a function or symbol across the codebase.",
        parameters: z.object({ repo_id: z.string().uuid(), function_name: z.string() }),
        execute: async ({ repo_id, function_name }) => {
          const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/mcp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method: "tools/call", params: { name: "find_callers", arguments: { repo_id, function_name } } }),
          });
          return res.json();
        },
      },
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
