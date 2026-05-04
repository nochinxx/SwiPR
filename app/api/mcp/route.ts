/**
 * SwiPR MCP server — 12 tools split into surface (4), deeper (6), state (2).
 *
 * Surface tools are auto-called when a card becomes active.
 * Deeper tools are called on demand via quick-action buttons or free-text chat.
 * State tools capture decisions and session summaries.
 *
 * Claude Desktop / Cursor config:
 *   { "mcpServers": { "swipr": { "url": "https://<your-deployment>.vercel.app/api/mcp" } } }
 */

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { db } from "@/db";
import { repos, prs, prFiles, contributors, sessions, decisions, chatMessages } from "@/db/schema";
import { generateText } from "ai";
import { models } from "@/lib/ai";
import { embedText } from "@/lib/embed";
import { computeRiskScore } from "@/lib/scoring";
import { fetchFileContent } from "@/lib/github";

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getPRWithRepo(prId: string) {
  const [pr] = await db
    .select()
    .from(prs)
    .where(eq(prs.id, prId))
    .limit(1);
  if (!pr) throw new Error(`PR ${prId} not found`);

  const [repo] = await db.select().from(repos).where(eq(repos.id, pr.repoId)).limit(1);
  if (!repo) throw new Error(`Repo for PR ${prId} not found`);

  const files = await db.select().from(prFiles).where(eq(prFiles.prId, prId));

  return { pr, repo, files };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

const handler = createMcpHandler(
  (server) => {
    // ── LOOKUP TOOL — always call this first to resolve owner/repo#number → pr_id ──

    server.tool(
      "lookup_pr",
      "Resolve a GitHub PR (owner, repo, number) to its SwiPR internal pr_id and basic metadata. Always call this first when the user refers to a PR by owner/repo#number.",
      {
        owner: z.string(),
        repo: z.string(),
        number: z.number().int().positive(),
      },
      async ({ owner, repo, number }) => {
        const [repoRow] = await db
          .select()
          .from(repos)
          .where(and(eq(repos.owner, owner), eq(repos.name, repo)))
          .limit(1);

        if (!repoRow) {
          return ok({ error: `Repo ${owner}/${repo} not found in SwiPR. It may need to be ingested first.` });
        }

        const [pr] = await db
          .select()
          .from(prs)
          .where(and(eq(prs.repoId, repoRow.id), eq(prs.number, number)))
          .limit(1);

        if (!pr) {
          return ok({ error: `PR #${number} not found in ${owner}/${repo}. It may need to be ingested first.` });
        }

        return ok({
          pr_id: pr.id,
          repo_id: repoRow.id,
          number: pr.number,
          title: pr.title,
          author: pr.authorHandle,
          additions: pr.additions,
          deletions: pr.deletions,
          changed_files: pr.changedFiles,
          html_url: pr.htmlUrl,
        });
      }
    );

    // ── SURFACE TOOLS ──────────────────────────────────────────────────────

    server.tool(
      "analyze_pr",
      "Analyze a PR and return 3 concise bullets describing what it does plus any risk callouts. Call this automatically when a card becomes active.",
      { pr_id: z.string().uuid() },
      async ({ pr_id }) => {
        const { pr, files } = await getPRWithRepo(pr_id);
        const fileList = files.slice(0, 20).map((f) => `${f.status} ${f.filename}`).join("\n");
        const diffSnippet = files
          .slice(0, 5)
          .map((f) => f.patch?.slice(0, 500) ?? "")
          .join("\n---\n");

        const { text } = await generateText({
          model: models.sonnet,
          messages: [
            {
              role: "user",
              content: `Analyze this GitHub PR and return exactly 3 bullet points. Each bullet should be one sentence. Cover: (1) what the PR does, (2) the main risk or concern, (3) a notable implementation detail.

PR #${pr.number}: ${pr.title}
Author: ${pr.authorHandle}
Changes: +${pr.additions}/-${pr.deletions} across ${pr.changedFiles} files

Files changed:
${fileList}

Diff sample:
${diffSnippet}

PR body: ${pr.body?.slice(0, 1000) ?? "(empty)"}

Return only the 3 bullets as plain text, no markdown, no intro.`,
            },
          ],
        });

        return ok({ pr_id, analysis: text, pr_number: pr.number, title: pr.title });
      }
    );

    server.tool(
      "risk_score",
      "Return a 0-100 risk score for a PR with rationale. Pass verbose=true for a line-by-line breakdown.",
      {
        pr_id: z.string().uuid(),
        verbose: z.boolean().optional().default(false),
      },
      async ({ pr_id, verbose }) => {
        const { pr, files } = await getPRWithRepo(pr_id);

        const [contributor] = await db
          .select()
          .from(contributors)
          .where(and(eq(contributors.repoId, pr.repoId), eq(contributors.handle, pr.authorHandle)))
          .limit(1);

        const { score, reasons } = computeRiskScore(
          pr,
          files,
          contributor?.totalPrs ?? 0,
          contributor?.mergedPrs ?? 0
        );

        if (!verbose) {
          return ok({ pr_id, score, summary: reasons[0] ?? "Low risk" });
        }

        // Verbose: ask Sonnet for a richer rationale
        const { text: rationale } = await generateText({
          model: models.sonnet,
          messages: [
            {
              role: "user",
              content: `Given this PR risk analysis, write a 2-3 sentence rationale explaining the risk level of ${score}/100.

PR: ${pr.title}
Heuristic reasons: ${reasons.join("; ")}

Be specific and actionable. Don't repeat the reasons verbatim.`,
            },
          ],
        });

        return ok({ pr_id, score, reasons, rationale });
      }
    );

    server.tool(
      "find_similar_changes",
      "Find past PRs in this repo that are semantically similar to the given PR. Uses pgvector cosine search over PR embeddings.",
      {
        pr_id: z.string().uuid(),
        k: z.number().int().positive().max(10).default(5),
      },
      async ({ pr_id, k }) => {
        const { pr } = await getPRWithRepo(pr_id);

        if (!pr.embedding) {
          return ok({ pr_id, similar: [], note: "PR not yet embedded" });
        }

        const vec = `[${pr.embedding.join(",")}]`;

        const similar = await db
          .select({
            id: prs.id,
            number: prs.number,
            title: prs.title,
            authorHandle: prs.authorHandle,
            additions: prs.additions,
            deletions: prs.deletions,
            htmlUrl: prs.htmlUrl,
            distance: sql<number>`${prs.embedding} <=> ${vec}::vector`,
          })
          .from(prs)
          .where(and(eq(prs.repoId, pr.repoId), sql`${prs.id} != ${pr_id}`, sql`${prs.embedding} IS NOT NULL`))
          .orderBy(sql`${prs.embedding} <=> ${vec}::vector`)
          .limit(k);

        return ok({ pr_id, similar });
      }
    );

    server.tool(
      "get_contributor_history",
      "Get the contribution history of a GitHub handle in a given repo — past PR count, merge rate, first contribution date.",
      {
        handle: z.string(),
        repo_id: z.string().uuid(),
      },
      async ({ handle, repo_id }) => {
        const [contributor] = await db
          .select()
          .from(contributors)
          .where(and(eq(contributors.repoId, repo_id), eq(contributors.handle, handle)))
          .limit(1);

        const recentPRs = await db
          .select({
            number: prs.number,
            title: prs.title,
            state: prs.state,
            prCreatedAt: prs.prCreatedAt,
          })
          .from(prs)
          .where(and(eq(prs.repoId, repo_id), eq(prs.authorHandle, handle)))
          .orderBy(desc(prs.prCreatedAt))
          .limit(10);

        const mergeRate =
          contributor && contributor.totalPrs > 0
            ? Math.round((contributor.mergedPrs / contributor.totalPrs) * 100)
            : null;

        return ok({
          handle,
          totalPrs: contributor?.totalPrs ?? 0,
          mergedPrs: contributor?.mergedPrs ?? 0,
          mergeRate: mergeRate !== null ? `${mergeRate}%` : "unknown",
          firstPrAt: contributor?.firstPrAt ?? null,
          recentPRs,
        });
      }
    );

    // ── DEEPER TOOLS ───────────────────────────────────────────────────────

    server.tool(
      "inspect_file",
      "Fetch and analyze a specific file from the repo. Optionally focus the analysis on a question.",
      {
        repo_id: z.string().uuid(),
        path: z.string(),
        question: z.string().optional(),
      },
      async ({ repo_id, path, question }) => {
        const [repo] = await db.select().from(repos).where(eq(repos.id, repo_id)).limit(1);
        if (!repo) throw new Error(`Repo ${repo_id} not found`);

        const content = await fetchFileContent(repo.owner, repo.name, path);
        if (!content) {
          return ok({ path, error: "File not found or could not be fetched" });
        }

        const prompt = question
          ? `Analyze this file and answer: "${question}"\n\nFile: ${path}\n\n${content.slice(0, 6000)}`
          : `Summarize the purpose and key exports of this file in 3-5 sentences.\n\nFile: ${path}\n\n${content.slice(0, 6000)}`;

        const { text } = await generateText({
          model: models.sonnet,
          messages: [{ role: "user", content: prompt }],
        });

        return ok({ path, content: content.slice(0, 2000), analysis: text });
      }
    );

    server.tool(
      "find_callers",
      "Search across changed files for usages of a given function or symbol name. Returns matching filenames and line numbers.",
      {
        repo_id: z.string().uuid(),
        function_name: z.string(),
      },
      async ({ repo_id, function_name }) => {
        // Search over pr_files patches for the function name
        const matchingFiles = await db
          .select({
            prId: prFiles.prId,
            filename: prFiles.filename,
            patch: prFiles.patch,
          })
          .from(prFiles)
          .innerJoin(prs, eq(prFiles.prId, prs.id))
          .where(and(eq(prs.repoId, repo_id), sql`${prFiles.patch} ILIKE ${'%' + function_name + '%'}`))
          .limit(20);

        const results = matchingFiles.map((f) => {
          const lines = (f.patch ?? "").split("\n");
          const matchingLines = lines
            .map((line, i) => ({ line: i + 1, content: line }))
            .filter(({ content }) => content.includes(function_name))
            .slice(0, 5);
          return { filename: f.filename, matchingLines };
        });

        return ok({ function_name, results });
      }
    );

    server.tool(
      "find_related_tests",
      "Find test files that likely cover the changed code in this PR.",
      { pr_id: z.string().uuid() },
      async ({ pr_id }) => {
        const files = await db.select().from(prFiles).where(eq(prFiles.prId, pr_id));

        const changedModules = files
          .map((f) => f.filename.replace(/\.(ts|tsx|js|jsx)$/, "").replace(/^(src|lib|app)\//, ""))
          .filter(Boolean);

        const testFiles = await db
          .select({ filename: prFiles.filename })
          .from(prFiles)
          .innerJoin(prs, eq(prFiles.prId, prs.id))
          .where(
            and(
              eq(prs.repoId, (await db.select({ repoId: prs.repoId }).from(prs).where(eq(prs.id, pr_id)).limit(1))[0]?.repoId ?? ""),
              sql`${prFiles.filename} ~ '\\.(test|spec)\\.(ts|tsx|js|jsx)$'`
            )
          )
          .limit(20);

        const related = testFiles.filter((tf) =>
          changedModules.some((m) => tf.filename.includes(m.split("/").pop() ?? ""))
        );

        return ok({ pr_id, changedModules, relatedTests: related.map((f) => f.filename) });
      }
    );

    server.tool(
      "git_blame_summary",
      "Return the recent contributors to a given file path based on PR history.",
      {
        repo_id: z.string().uuid(),
        path: z.string(),
      },
      async ({ repo_id, path }) => {
        const recentEdits = await db
          .select({
            authorHandle: prs.authorHandle,
            prNumber: prs.number,
            prTitle: prs.title,
            editedAt: prs.prUpdatedAt,
          })
          .from(prFiles)
          .innerJoin(prs, eq(prFiles.prId, prs.id))
          .where(and(eq(prs.repoId, repo_id), eq(prFiles.filename, path)))
          .orderBy(desc(prs.prUpdatedAt))
          .limit(10);

        return ok({ path, recentEdits });
      }
    );

    server.tool(
      "compare_with",
      "Show which files were changed in this PR relative to a git ref (e.g. 'main', 'v3.2.0'). Fetches file content at the ref for comparison.",
      {
        repo_id: z.string().uuid(),
        pr_id: z.string().uuid(),
        ref: z.string().default("main"),
      },
      async ({ repo_id, pr_id, ref }) => {
        const [repo] = await db.select().from(repos).where(eq(repos.id, repo_id)).limit(1);
        if (!repo) throw new Error(`Repo ${repo_id} not found`);

        const files = await db
          .select({ filename: prFiles.filename, status: prFiles.status, additions: prFiles.additions, deletions: prFiles.deletions })
          .from(prFiles)
          .where(eq(prFiles.prId, pr_id));

        // Fetch content at ref for the top 3 changed files
        const topFiles = files.slice(0, 3);
        const atRef = await Promise.all(
          topFiles.map(async (f) => ({
            filename: f.filename,
            contentAtRef: (await fetchFileContent(repo.owner, repo.name, f.filename, ref))?.slice(0, 1000) ?? null,
          }))
        );

        return ok({ pr_id, ref, changedFiles: files, contentAtRef: atRef });
      }
    );

    server.tool(
      "summarize_dependency",
      "Explain what an npm package is and why it appears in this PR, based on the PR context.",
      {
        repo_id: z.string().uuid(),
        package_name: z.string(),
      },
      async ({ repo_id, package_name }) => {
        const { text } = await generateText({
          model: models.haiku,
          messages: [
            {
              role: "user",
              content: `Explain what the npm package "${package_name}" does in 2-3 sentences. Focus on what a code reviewer would want to know: its purpose, whether it's well-maintained, and any security or bundle-size concerns.`,
            },
          ],
        });
        return ok({ package_name, summary: text });
      }
    );

    // ── STATE TOOLS ────────────────────────────────────────────────────────

    server.tool(
      "record_decision",
      "Record a reviewer decision (approve, changes, skip) for a PR in the current session.",
      {
        session_id: z.string().uuid(),
        pr_id: z.string().uuid(),
        action: z.enum(["approve", "changes", "skip"]),
        note: z.string().optional(),
      },
      async ({ session_id, pr_id, action, note }) => {
        const [decision] = await db
          .insert(decisions)
          .values({ sessionId: session_id, prId: pr_id, action, note })
          .returning();

        await db
          .update(sessions)
          .set({ decisionsCount: sql`${sessions.decisionsCount} + 1` })
          .where(eq(sessions.id, session_id));

        return ok(decision);
      }
    );

    server.tool(
      "summarize_session",
      "Return stats and a brief reflection for a completed review session.",
      { session_id: z.string().uuid() },
      async ({ session_id }) => {
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, session_id))
          .limit(1);

        if (!session) throw new Error(`Session ${session_id} not found`);

        const allDecisions = await db
          .select({ action: decisions.action, decidedAt: decisions.decidedAt })
          .from(decisions)
          .where(eq(decisions.sessionId, session_id))
          .orderBy(decisions.decidedAt);

        const approved = allDecisions.filter((d) => d.action === "approve").length;
        const changesRequested = allDecisions.filter((d) => d.action === "changes").length;
        const skipped = allDecisions.filter((d) => d.action === "skip").length;
        const total = allDecisions.length;

        const durationMs =
          session.endedAt && session.startedAt
            ? session.endedAt.getTime() - session.startedAt.getTime()
            : null;

        return ok({
          session_id,
          total,
          approved,
          changesRequested,
          skipped,
          approvalRate: total > 0 ? `${Math.round((approved / total) * 100)}%` : "0%",
          durationMinutes: durationMs ? Math.round(durationMs / 60000) : null,
        });
      }
    );
  },
  {
    serverInfo: { name: "swipr", version: "0.1.0" },
  },
  {
    basePath: "/api",
  }
);

export { handler as GET, handler as POST, handler as DELETE };
