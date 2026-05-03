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

      // Pick the best file to show as diff preview:
      // prefer source files with a non-empty patch over config/docs files.
      const allFiles = await db.select().from(prFiles).where(eq(prFiles.prId, pr.id));

      const SOURCE_RE = /\.(ts|tsx|js|jsx|py|go|rs|rb|java|swift|kt|c|cpp|cs)$/;
      const withPatch = allFiles.filter((f) => f.patch && f.patch.length > 10);
      const diffFile =
        withPatch.find((f) => SOURCE_RE.test(f.filename)) ??
        withPatch[0] ??
        allFiles[0];

      let diff: ReturnType<typeof parsePatch>;
      if (diffFile?.patch) {
        diff = parsePatch(diffFile.patch, diffFile.filename, 10);
      } else {
        const count = allFiles.length;
        const fileWord = count === 1 ? "file" : "files";
        const filePath = count > 0 ? `${count} ${fileWord} changed` : "(no diff)";
        diff = {
          filePath,
          lines: allFiles.slice(0, 6).map((f) => {
            let prefix = " ";
            if (f.status === "added") prefix = "+";
            else if (f.status === "removed") prefix = "-";
            return {
              type: "context" as const,
              content: `${prefix} ${f.filename}  +${f.additions} -${f.deletions}`,
            };
          }),
        };
      }

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
        htmlUrl: pr.htmlUrl,
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
