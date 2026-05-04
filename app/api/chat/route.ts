/**
 * POST /api/chat
 * Streaming chat for the AI context panel. Tools call DB functions directly.
 * Gracefully degrades when AI Gateway is unavailable.
 */

import { streamText } from "ai";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { models } from "@/lib/ai";
import { db, prs, prFiles, contributors } from "@/db";
import { computeRiskScore } from "@/lib/scoring";

export async function POST(req: Request) {
  const { messages, prId, repoId } = await req.json();

  try {
    const result = streamText({
      model: models.sonnet,
      system: `You are a senior software engineer helping review a GitHub Pull Request.
Answer questions concisely — reviewers are busy. Lead with the most actionable insight.
Current PR ID: ${prId ?? "unknown"}. Repo ID: ${repoId ?? "unknown"}.`,
      messages,
      tools: {
        risk_score: {
          description: "Get the heuristic risk score (0-100) for the active PR with reasons.",
          parameters: z.object({}),
          execute: async () => {
            if (!prId) return { error: "No active PR" };
            const [pr] = await db.select().from(prs).where(eq(prs.id, prId)).limit(1);
            if (!pr) return { error: "PR not found" };
            const files = await db.select().from(prFiles).where(eq(prFiles.prId, prId));
            const [contributor] = await db
              .select()
              .from(contributors)
              .where(and(eq(contributors.repoId, pr.repoId), eq(contributors.handle, pr.authorHandle)))
              .limit(1);
            return computeRiskScore(pr, files, contributor?.totalPrs ?? 0, contributor?.mergedPrs ?? 0);
          },
        },
        contributor_history: {
          description: "Get the PR history and merge rate for the author of the active PR.",
          parameters: z.object({}),
          execute: async () => {
            if (!prId || !repoId) return { error: "No active PR" };
            const [pr] = await db.select().from(prs).where(eq(prs.id, prId)).limit(1);
            if (!pr) return { error: "PR not found" };
            const [contributor] = await db
              .select()
              .from(contributors)
              .where(and(eq(contributors.repoId, repoId), eq(contributors.handle, pr.authorHandle)))
              .limit(1);
            const mergeRate =
              contributor && contributor.totalPrs > 0
                ? Math.round((contributor.mergedPrs / contributor.totalPrs) * 100)
                : 0;
            return {
              handle: pr.authorHandle,
              totalPrs: contributor?.totalPrs ?? 0,
              mergedPrs: contributor?.mergedPrs ?? 0,
              mergeRate: `${mergeRate}%`,
              firstPrAt: contributor?.firstPrAt ?? null,
            };
          },
        },
        list_changed_files: {
          description: "List all files changed in the active PR with their diff stats.",
          parameters: z.object({}),
          execute: async () => {
            if (!prId) return { error: "No active PR" };
            const files = await db
              .select({ filename: prFiles.filename, status: prFiles.status, additions: prFiles.additions, deletions: prFiles.deletions })
              .from(prFiles)
              .where(eq(prFiles.prId, prId));
            return { files };
          },
        },
        find_callers: {
          description: "Search changed file patches for usages of a function or symbol.",
          parameters: z.object({ name: z.string().describe("Function or symbol name to search for") }),
          execute: async ({ name }) => {
            if (!repoId) return { error: "No repo context" };
            const matches = await db
              .select({ filename: prFiles.filename, patch: prFiles.patch })
              .from(prFiles)
              .innerJoin(prs, eq(prFiles.prId, prs.id))
              .where(and(eq(prs.repoId, repoId), sql`${prFiles.patch} ILIKE ${"%" + name + "%"}`))
              .limit(10);
            return {
              symbol: name,
              results: matches.map((f) => ({
                filename: f.filename,
                lines: (f.patch ?? "").split("\n").filter((l) => l.includes(name)).slice(0, 5),
              })),
            };
          },
        },
      },
      maxSteps: 3,
    });

    return result.toDataStreamResponse();
  } catch (err) {
    const msg =
      err instanceof Error && err.message.includes("credit card")
        ? "AI chat requires a Vercel AI Gateway credit card. Add one at vercel.com/ai-gateway to enable."
        : "AI chat is temporarily unavailable.";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`0:${JSON.stringify(msg)}\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "x-vercel-ai-data-stream": "v1" },
    });
  }
}
