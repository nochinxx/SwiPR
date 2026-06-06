/**
 * POST /api/deeper
 * Powers the DEEPER quick-action buttons in the AI context panel.
 * Calls tool logic directly — no MCP protocol, no SSE, no 406.
 *
 * Body: { action: "risk_verbose" | "callers" | "tests" | "compare", prId, repoId }
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db, prs, prFiles, contributors, repos } from "@/db";
import { generateText } from "ai";
import { getModelForKey } from "@/lib/ai";
import { computeRiskScore } from "@/lib/scoring";
import { fetchFileContent } from "@/lib/github";

type DeeperAction = "risk_verbose" | "callers" | "tests" | "compare";

export async function POST(req: NextRequest) {
  const { action, prId, repoId } = (await req.json()) as {
    action: DeeperAction;
    prId: string;
    repoId: string;
  };
  const byokKey = req.headers.get("x-api-key");

  if (!action || !prId || !repoId) {
    return NextResponse.json({ error: "action, prId, and repoId are required" }, { status: 400 });
  }

  const [pr] = await db.select().from(prs).where(eq(prs.id, prId)).limit(1);
  if (!pr) return NextResponse.json({ error: "PR not found" }, { status: 404 });

  const files = await db.select().from(prFiles).where(eq(prFiles.prId, prId));

  switch (action) {
    case "risk_verbose": {
      const [contributor] = await db
        .select()
        .from(contributors)
        .where(and(eq(contributors.repoId, repoId), eq(contributors.handle, pr.authorHandle)))
        .limit(1);

      const { score, reasons } = computeRiskScore(
        pr,
        files,
        contributor?.totalPrs ?? 0,
        contributor?.mergedPrs ?? 0
      );

      try {
        const { text } = await generateText({
          model: getModelForKey(byokKey),
          messages: [
            {
              role: "user",
              content: `This PR has a risk score of ${score}/100. Reasons: ${reasons.join("; ")}. Write 2-3 sentences explaining the risk to a code reviewer. Be specific and actionable.`,
            },
          ],
        });
        return NextResponse.json({ score, reasons, rationale: text });
      } catch {
        return NextResponse.json({ score, reasons, rationale: reasons.join(" ") });
      }
    }

    case "callers": {
      const funcMatch = /`(\w+)`/.exec(pr.title);
      const functionName = funcMatch?.[1] ?? pr.title.split(" ").pop() ?? "main";

      const matches = await db
        .select({ filename: prFiles.filename, patch: prFiles.patch })
        .from(prFiles)
        .innerJoin(prs, eq(prFiles.prId, prs.id))
        .where(
          and(
            eq(prs.repoId, repoId),
            sql`${prFiles.patch} ILIKE ${"%" + functionName + "%"}`
          )
        )
        .limit(10);

      const results = matches.map((f) => {
        const lines = (f.patch ?? "").split("\n");
        const hits = lines
          .map((l, i) => ({ line: i + 1, content: l }))
          .filter(({ content }) => content.includes(functionName))
          .slice(0, 3);
        return { filename: f.filename, hits };
      });

      return NextResponse.json({ functionName, results });
    }

    case "tests": {
      const changedModules = files
        .map((f) => f.filename.replace(/\.(ts|tsx|js|jsx)$/, "").split("/").pop() ?? "")
        .filter(Boolean);

      const testFiles = await db
        .select({ filename: prFiles.filename })
        .from(prFiles)
        .innerJoin(prs, eq(prFiles.prId, prs.id))
        .where(
          and(
            eq(prs.repoId, repoId),
            sql`${prFiles.filename} ~ '\\.(test|spec)\\.(ts|tsx|js|jsx)$'`
          )
        )
        .limit(20);

      const related = testFiles.filter((tf) =>
        changedModules.some((m) => tf.filename.includes(m))
      );

      return NextResponse.json({
        changedModules,
        relatedTests: related.map((f) => f.filename),
        note: related.length === 0 ? "No test files found for the changed modules." : undefined,
      });
    }

    case "compare": {
      const [repo] = await db.select().from(repos).where(eq(repos.id, repoId)).limit(1);
      if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

      const topFiles = files.slice(0, 3);
      const atRef = await Promise.all(
        topFiles.map(async (f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          contentSnippet: (
            await fetchFileContent(repo.owner, repo.name, f.filename, "main")
          )?.slice(0, 800) ?? null,
        }))
      );

      return NextResponse.json({ ref: "main", files: atRef });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
