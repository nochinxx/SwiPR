/**
 * GET /api/context?prId=<uuid>
 *
 * Returns surface context for a PR — all 4 surface tool results in one call.
 * Called when a card becomes active in the swipe UI.
 * Gracefully degrades: risk score and contributor always return; AI summary
 * falls back to heuristic bullets if the AI Gateway is unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db, prs, prFiles, contributors } from "@/db";
import { generateText } from "ai";
import { getModelForKey } from "@/lib/ai";
import { computeRiskScore } from "@/lib/scoring";
import { relativeTime } from "@/lib/diff";
import type { AIContext } from "@/app/swipe/_types";

function fallbackSummary(
  pr: { additions: number; deletions: number; changedFiles: number },
  totalPrs: number
): string[] {
  const added = pr.additions > 0 ? `+${pr.additions}` : "";
  const removed = pr.deletions > 0 ? `-${pr.deletions}` : "";
  const changes = [added, removed].filter(Boolean).join(" / ");
  const files = `${pr.changedFiles} file${pr.changedFiles === 1 ? "" : "s"}`;
  const prWord = totalPrs === 1 ? "PR" : "PRs";
  return [
    `Changes ${changes} lines across ${files}.`,
    `Author has ${totalPrs} prior ${prWord} in this repo.`,
    "AI summary unavailable — set your Anthropic key (⌘ button) to enable.",
  ];
}

function toSimilarState(state: string): "merged" | "closed" | "open" {
  if (state === "merged") return "merged";
  if (state === "closed") return "closed";
  return "open";
}

export async function GET(req: NextRequest) {
  const prId = new URL(req.url).searchParams.get("prId");
  const userApiKey = req.headers.get("x-user-api-key");
  if (!prId) return NextResponse.json({ error: "prId is required" }, { status: 400 });

  const [pr] = await db.select().from(prs).where(eq(prs.id, prId)).limit(1);
  if (!pr) return NextResponse.json({ error: "PR not found" }, { status: 404 });

  const files = await db.select().from(prFiles).where(eq(prFiles.prId, prId));

  const [contributor] = await db
    .select()
    .from(contributors)
    .where(and(eq(contributors.repoId, pr.repoId), eq(contributors.handle, pr.authorHandle)))
    .limit(1);

  const totalPrs = contributor?.totalPrs ?? 0;
  const embedding = pr.embedding;

  const [riskResult, summaryResult, similarResult] = await Promise.all([
    // 1. Risk score — heuristic, no LLM needed
    Promise.resolve(computeRiskScore(pr, files, totalPrs, contributor?.mergedPrs ?? 0)),

    // 2. Summary — read from cache if available, otherwise call Sonnet once and cache it
    (async (): Promise<string[]> => {
      if (pr.aiSummary && pr.aiSummary.length > 0) return pr.aiSummary;
      try {
        const result = await generateText({
          model: getModelForKey(userApiKey),
          messages: [{
            role: "user",
            content: [
              `Analyze this GitHub PR and return exactly 3 bullet points.`,
              `Each bullet must be one short sentence.`,
              `Cover: (1) what the PR does, (2) the main risk or concern, (3) a notable detail.`,
              ``,
              `PR #${pr.number}: ${pr.title}`,
              `Author: ${pr.authorHandle}`,
              `Changes: +${pr.additions}/-${pr.deletions} across ${pr.changedFiles} files`,
              `Files: ${files.slice(0, 10).map((f) => f.filename).join(", ")}`,
              `Body: ${pr.body?.slice(0, 800) ?? "(empty)"}`,
              ``,
              `Return only the 3 bullets, no markdown, no numbers, no intro. One bullet per line.`,
            ].join("\n"),
          }],
        });
        const bullets = result.text.trim().split("\n").filter(Boolean).slice(0, 3);
        // Cache for future requests — fire and forget
        db.update(prs).set({ aiSummary: bullets, aiAnalyzedAt: new Date() }).where(eq(prs.id, pr.id)).catch(() => {});
        return bullets;
      } catch {
        return fallbackSummary(pr, totalPrs);
      }
    })(),

    // 3. Similar PRs — pgvector cosine search
    embedding
      ? ((): Promise<{ number: number; title: string; state: string; prCreatedAt: Date }[]> => {
          const vec = "[" + embedding.join(",") + "]";
          return db
            .select({ number: prs.number, title: prs.title, state: prs.state, prCreatedAt: prs.prCreatedAt })
            .from(prs)
            .where(and(eq(prs.repoId, pr.repoId), sql`${prs.id} != ${prId}`, sql`${prs.embedding} IS NOT NULL`))
            .orderBy(sql`${prs.embedding} <=> ${vec}::vector`)
            .limit(3);
        })()
      : Promise.resolve<{ number: number; title: string; state: string; prCreatedAt: Date }[]>([]),
  ]);

  const mergeRate =
    contributor && contributor.totalPrs > 0
      ? Math.round((contributor.mergedPrs / contributor.totalPrs) * 100)
      : 0;

  const context: AIContext = {
    risk: {
      score: riskResult.score,
      rationale: riskResult.reasons[0]?.text ?? "No significant risk factors detected.",
      reasons: riskResult.reasons,
    },
    prHtmlUrl: pr.htmlUrl ?? undefined,
    summary: summaryResult.length > 0 ? summaryResult : fallbackSummary(pr, totalPrs),
    similarPRs: similarResult.map((p) => ({
      number: p.number,
      title: p.title,
      state: toSimilarState(p.state),
      date: relativeTime(p.prCreatedAt),
    })),
    contributor: {
      handle: pr.authorHandle,
      avatarUrl: contributor?.avatarUrl ?? "",
      priorPRs: totalPrs,
      mergeRate,
      firstPR: contributor?.firstPrAt ? relativeTime(contributor.firstPrAt) : "unknown",
    },
  };

  return NextResponse.json(context);
}
