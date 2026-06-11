/**
 * GET /api/impact?prId=<uuid>
 *
 * Parses changed symbols from the PR's patches, searches GitHub for callers,
 * and returns a structured impact map + Mermaid graph string.
 * Called lazily when a PR card becomes active in the swipe UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, prs, prFiles, repos } from "@/db";
import { buildImpactMap } from "@/lib/impact";

export async function GET(req: NextRequest) {
  const prId = new URL(req.url).searchParams.get("prId");
  if (!prId) return NextResponse.json({ error: "prId is required" }, { status: 400 });

  const [pr] = await db.select().from(prs).where(eq(prs.id, prId)).limit(1);
  if (!pr) return NextResponse.json({ error: "PR not found" }, { status: 404 });

  const [repo] = await db.select().from(repos).where(eq(repos.id, pr.repoId)).limit(1);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  const files = await db
    .select({ filename: prFiles.filename, patch: prFiles.patch, additions: prFiles.additions, deletions: prFiles.deletions })
    .from(prFiles)
    .where(eq(prFiles.prId, prId));

  // Always return something — fall back to file list if caller search fails
  try {
    const impact = await buildImpactMap(repo.owner, repo.name, files);
    return NextResponse.json(impact);
  } catch {
    return NextResponse.json({
      changedFiles: files.map((f) => ({ filename: f.filename, symbols: [], additions: f.additions ?? 0, deletions: f.deletions ?? 0 })),
      symbols: [],
      mermaidGraph: "",
    });
  }
}
