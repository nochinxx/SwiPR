/**
 * GET /api/context?prId=<uuid>
 *
 * Returns surface context for a PR — all 4 surface tool results in one call.
 * Called when a card becomes active in the swipe UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, prs, prFiles, contributors, repos } from "@/db";
import { generateText } from "ai";
import { models } from "@/lib/ai";
import { computeRiskScore } from "@/lib/scoring";
import { relativeTime } from "@/lib/diff";
import type { AIContext } from "@/app/swipe/_types";

export async function GET(req: NextRequest) {
  const prId = new URL(req.url).searchParams.get("prId");
  if (!prId) return NextResponse.json({ error: "prId is required" }, { status: 400 });

  const [pr] = await db.select().from(prs).where(eq(prs.id, prId)).limit(1);
  if (!pr) return NextResponse.json({ error: "PR not found" }, { status: 404 });

  const files = await db.select().from(prFiles).where(eq(prFiles.prId, prId));

  const [contributor] = await db
    .select()
    .from(contributors)
    .where(and(eq(contributors.repoId, pr.repoId), eq(contributors.handle, pr.authorHandle)))
    .limit(1);

  // Run all 4 surface calls in parallel
  const [riskResult, summaryResult, similarResult] = await Promise.all([
    // 1. Risk score (heuristic — no LLM needed)
    Promise.resolve(
      computeRiskScore(pr, files, contributor?.totalPrs ?? 0, contributor?.mergedPrs ?? 0)
    ),

    // 2. analyze_pr — 3 bullets from Sonnet
    generateText({
      model: models.sonnet,
      messages: [
        {
          role: "user",
          content: `Analyze this GitHub PR and return exactly 3 bullet points. Each bullet must be one short sentence. Cover: (1) what the PR does, (2) the main risk or concern, (3) a notable detail.

PR #${pr.number}: ${pr.title}
Author: ${pr.authorHandle}
Changes: +${pr.additions}/-${pr.deletions} across ${pr.changedFiles} files
Files: ${files.slice(0, 10).map((f) => f.filename).join(", ")}
Body: ${pr.body?.slice(0, 800) ?? "(empty)"}

Return only the 3 bullets, no markdown, no numbers, no intro. One bullet per line.`,
        },
      ],
    }).then((r) => r.text.trim().split("\n").filter(Boolean).slice(0, 3)),

    // 3. find_similar_changes — pgvector cosine search
    pr.embedding
      ? db
          .select({
            number: prs.number,
            title: prs.title,
            state: prs.state,
            prCreatedAt: prs.prCreatedAt,
          })
          .from(prs)
          .where(
            and(
              eq(prs.repoId, pr.repoId),
              sql`${prs.id} != ${prId}`,
              sql`${prs.embedding} IS NOT NULL`
            )
          )
          .orderBy(sql`${prs.embedding} <=> ${`[${pr.embedding.join(",")}]`}::vector`)
          .limit(3)
      : Promise.resolve([]),
  ]);

  const context: AIContext = {
    risk: {
      score: riskResult.score,
      rationale: riskResult.reasons[0] ?? "No significant risk factors detected.",
    },
    summary: summaryResult.length > 0 ? summaryResult : ["Analysis pending"],
    similarPRs: (similarResult as { number: number; title: string; state: string; prCreatedAt: Date }[]).map((p) => ({
      number: p.number,
      title: p.title,
      state: p.state === "merged" ? "merged" : p.state === "closed" ? "closed" : "open",
      date: relativeTime(p.prCreatedAt),
    })),
    contributor: {
      handle: pr.authorHandle,
      avatarUrl:
        contributor?.avatarUrl ??
        `https://avatars.githubusercontent.com/u/0?v=4`,
      priorPRs: contributor?.totalPrs ?? 0,
      mergeRate:
        contributor && contributor.totalPrs > 0
          ? Math.round((contributor.mergedPrs / contributor.totalPrs) * 100)
          : 0,
      firstPR: contributor?.firstPrAt ? relativeTime(contributor.firstPrAt) : "unknown",
    },
  };

  return NextResponse.json(context);
}
