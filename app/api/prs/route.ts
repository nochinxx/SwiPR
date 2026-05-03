/**
 * GET /api/prs?owner=resend&repo=resend-node
 *
 * Returns open PRs for a repo from the DB in the shape the swipe UI expects.
 * Call /api/ingest first to populate the DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db, repos, prs, prFiles, contributors } from "@/db";
import { parsePatch, relativeTime } from "@/lib/diff";
import type { PullRequest } from "@/app/swipe/_types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner")?.trim();
  const repo = searchParams.get("repo")?.trim();

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 });
  }

  const [repoRow] = await db
    .select()
    .from(repos)
    .where(and(eq(repos.owner, owner), eq(repos.name, repo)))
    .limit(1);

  if (!repoRow) {
    return NextResponse.json({ error: "Repo not found. Call /api/ingest first." }, { status: 404 });
  }

  const prRows = await db
    .select()
    .from(prs)
    .where(and(eq(prs.repoId, repoRow.id), eq(prs.state, "open")))
    .orderBy(desc(prs.prCreatedAt))
    .limit(50);

  const result: (PullRequest & { id: string; repoId: string })[] = await Promise.all(
    prRows.map(async (pr) => {
      // Get contributor avatar
      const [contributor] = await db
        .select()
        .from(contributors)
        .where(and(eq(contributors.repoId, repoRow.id), eq(contributors.handle, pr.authorHandle)))
        .limit(1);

      // Get first changed file with a patch for diff preview
      const [firstFile] = await db
        .select()
        .from(prFiles)
        .where(and(eq(prFiles.prId, pr.id), eq(prFiles.status, "modified")))
        .limit(1);

      const diffFile = firstFile ?? (await db.select().from(prFiles).where(eq(prFiles.prId, pr.id)).limit(1))[0];

      const diff = diffFile?.patch
        ? parsePatch(diffFile.patch, diffFile.filename)
        : { filePath: "(no diff)", lines: [] };

      return {
        id: pr.id,
        repoId: repoRow.id,
        number: pr.number,
        state: pr.state as "open" | "closed" | "merged",
        title: pr.title,
        body: pr.body ?? "",
        author: {
          handle: pr.authorHandle,
          avatarUrl:
            contributor?.avatarUrl ??
            `https://avatars.githubusercontent.com/u/0?v=4`,
        },
        openedAt: relativeTime(pr.prCreatedAt),
        ciStatus: "passing" as const,
        filesChanged: pr.changedFiles,
        additions: pr.additions,
        deletions: pr.deletions,
        diff,
      };
    })
  );

  return NextResponse.json({
    repoId: repoRow.id,
    owner,
    repo,
    total: result.length,
    lastSynced: repoRow.lastSynced,
    prs: result,
  });
}
