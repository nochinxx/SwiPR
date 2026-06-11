/**
 * POST /api/ingest
 * Body: { owner: string; name: string }
 *
 * Fetches all open PRs for the given public GitHub repo, upserts them into
 * the database, embeds titles+bodies+patches, and updates contributor stats.
 *
 * Pre-warm Resend repos before the demo by calling this endpoint manually.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, repos, prs, prFiles, contributors } from "@/db";
import { fetchOpenPRs, fetchPRFiles, fetchRepoPRHistory } from "@/lib/github";
import { embedBatch } from "@/lib/embed";
import { generateText } from "ai";
import { getModelForKey } from "@/lib/ai";

export async function POST(req: NextRequest) {
  // Require a secret header when INGEST_SECRET is set (production).
  // Locally, leave INGEST_SECRET unset to allow open access.
  const secret = process.env.INGEST_SECRET;
  if (secret && req.headers.get("x-ingest-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userApiKey = req.headers.get("x-user-api-key");
  const body = await req.json();
  const owner = body?.owner?.toString().trim();
  const name = body?.name?.toString().trim();

  if (!owner || !name) {
    return NextResponse.json({ error: "owner and name are required" }, { status: 400 });
  }

  try {
    // 1. Upsert repo row
    let repo = (await db.select().from(repos).where(and(eq(repos.owner, owner), eq(repos.name, name))).limit(1))[0];

    if (!repo) {
      const [inserted] = await db.insert(repos).values({ owner, name }).returning();
      repo = inserted;
    }

    // 2. Fetch open PRs from GitHub — cap at 100 to keep DB manageable
    console.log(`[ingest] Fetching open PRs for ${owner}/${name}…`);
    const githubPRs = (await fetchOpenPRs(owner, name)).slice(0, 100);
    console.log(`[ingest] Found ${githubPRs.length} open PRs (capped at 100)`);

    const results: { number: number; status: "upserted" | "skipped"; error?: string }[] = [];

    // Collect data needed for batch embedding after all PRs are upserted
    const toEmbed: { prId: string; text: string }[] = [];

    for (const gpr of githubPRs) {
      try {
        // 3. Upsert PR row
        const existing = (
          await db
            .select()
            .from(prs)
            .where(and(eq(prs.repoId, repo.id), eq(prs.number, gpr.number)))
            .limit(1)
        )[0];

        let prId: string;

        if (existing) {
          await db
            .update(prs)
            .set({
              title: gpr.title,
              body: gpr.body ?? null,
              additions: gpr.additions,
              deletions: gpr.deletions,
              changedFiles: gpr.changed_files,
              prUpdatedAt: new Date(gpr.updated_at),
            })
            .where(eq(prs.id, existing.id));
          prId = existing.id;
        } else {
          const [inserted] = await db
            .insert(prs)
            .values({
              repoId: repo.id,
              number: gpr.number,
              title: gpr.title,
              body: gpr.body ?? null,
              state: "open",
              authorHandle: gpr.user?.login ?? "unknown",
              additions: gpr.additions,
              deletions: gpr.deletions,
              changedFiles: gpr.changed_files,
              htmlUrl: gpr.html_url,
              prCreatedAt: new Date(gpr.created_at),
              prUpdatedAt: new Date(gpr.updated_at),
            })
            .returning();
          prId = inserted.id;
        }

        // 4. Fetch and upsert PR files (no patch embeddings — too many gateway calls)
        const githubFiles = await fetchPRFiles(owner, name, gpr.number);

        await db.delete(prFiles).where(eq(prFiles.prId, prId));

        if (githubFiles.length > 0) {
          const validStatuses = ["added", "modified", "removed", "renamed"];
          const fileRows = githubFiles.map((f) => ({
            prId,
            filename: f.filename,
            status: (validStatuses.includes(f.status) ? f.status : "modified") as
              | "added"
              | "modified"
              | "removed"
              | "renamed",
            additions: f.additions,
            deletions: f.deletions,
            patch: f.patch ?? null,
          }));
          await db.insert(prFiles).values(fileRows);
        }

        // Queue PR text for batch embedding at end of ingest
        if (!existing?.embedding) {
          const prText = [
            gpr.title,
            gpr.body?.slice(0, 2000) ?? "",
            githubFiles.slice(0, 10).map((f) => f.filename).join(" "),
          ]
            .filter(Boolean)
            .join("\n");
          toEmbed.push({ prId, text: prText });
        }

        // 5. Generate and cache AI summary — once per PR, never regenerated unless missing
        const needsSummary = !existing?.aiSummary || existing.aiSummary.length === 0;
        if (needsSummary) {
          try {
            const fileList = githubFiles.slice(0, 10).map((f) => f.filename).join(", ");
            const { text } = await generateText({
              model: getModelForKey(userApiKey),
              messages: [{
                role: "user",
                content: [
                  `Analyze this GitHub PR and return exactly 3 bullet points.`,
                  `Each bullet must be one short sentence.`,
                  `Cover: (1) what the PR does, (2) the main risk or concern, (3) a notable detail.`,
                  ``,
                  `PR #${gpr.number}: ${gpr.title}`,
                  `Author: ${gpr.user?.login ?? "unknown"}`,
                  `Changes: +${gpr.additions}/-${gpr.deletions} across ${gpr.changed_files} files`,
                  `Files: ${fileList}`,
                  `Body: ${gpr.body?.slice(0, 800) ?? "(empty)"}`,
                  ``,
                  `Return only the 3 bullets, no markdown, no numbers, no intro. One bullet per line.`,
                ].join("\n"),
              }],
            });
            const bullets = text.trim().split("\n").filter(Boolean).slice(0, 3);
            await db.update(prs).set({ aiSummary: bullets, aiAnalyzedAt: new Date() }).where(eq(prs.id, prId));
          } catch (err) {
            console.warn("[ingest] AI summary skipped:", err);
          }
        }

        // 6. Update contributor stats
        const handle = gpr.user?.login ?? "unknown";
        const history = await fetchRepoPRHistory(owner, name, handle);

        const existingContributor = (
          await db
            .select()
            .from(contributors)
            .where(and(eq(contributors.repoId, repo.id), eq(contributors.handle, handle)))
            .limit(1)
        )[0];

        if (existingContributor) {
          await db
            .update(contributors)
            .set({
              totalPrs: history.total,
              mergedPrs: history.merged,
              firstPrAt: history.firstAt ? new Date(history.firstAt) : null,
              avatarUrl: gpr.user?.avatar_url ?? null,
              updatedAt: new Date(),
            })
            .where(eq(contributors.id, existingContributor.id));
        } else {
          await db.insert(contributors).values({
            repoId: repo.id,
            handle,
            avatarUrl: gpr.user?.avatar_url ?? null,
            firstPrAt: history.firstAt ? new Date(history.firstAt) : null,
            totalPrs: history.total,
            mergedPrs: history.merged,
          });
        }

        results.push({ number: gpr.number, status: "upserted" });
      } catch (err) {
        console.error(`[ingest] Failed PR #${gpr.number}:`, err);
        results.push({ number: gpr.number, status: "skipped", error: String(err) });
      }
    }

    // 7. Batch-embed all PR texts in one gateway call (avoids per-PR rate limit hits)
    if (toEmbed.length > 0) {
      try {
        console.log(`[ingest] Embedding ${toEmbed.length} PRs in one batch…`);
        const embeddings = await embedBatch(toEmbed.map((e) => e.text));
        await Promise.all(
          toEmbed.map((e, i) =>
            db.update(prs).set({ embedding: embeddings[i] }).where(eq(prs.id, e.prId))
          )
        );
        console.log(`[ingest] Embedded ${embeddings.length} PRs`);
      } catch (err) {
        console.warn("[ingest] PR batch embedding skipped:", err);
      }
    }

    // 8. Mark repo as synced
    await db.update(repos).set({ lastSynced: new Date() }).where(eq(repos.id, repo.id));

    return NextResponse.json({
      repo: `${owner}/${name}`,
      repoId: repo.id,
      total: githubPRs.length,
      results,
    });
  } catch (err) {
    console.error("[ingest] Fatal error:", err);
    const status = (err as { status?: number }).status;
    if (status === 401) {
      return NextResponse.json(
        { error: "GitHub token is invalid or expired. Rotate GITHUB_TOKEN in your Vercel environment variables." },
        { status: 502 }
      );
    }
    if (status === 404) {
      return NextResponse.json(
        { error: `Repository ${owner}/${name} not found or is private.` },
        { status: 404 }
      );
    }
    if (status === 403) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded or access denied. Try again later." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
