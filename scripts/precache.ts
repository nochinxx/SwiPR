/**
 * Pre-cache Resend repos for the demo.
 *
 * Calls /api/ingest for each repo — fetches PRs from GitHub, embeds them,
 * and stores everything in Neon. Run this before going on stage.
 *
 * Usage:
 *   pnpm tsx scripts/precache.ts
 *
 * Requires the dev server (or a deployed URL) to be running.
 * Set BASE_URL env var to point at a deployed instance:
 *   BASE_URL=https://your-deployment.vercel.app pnpm tsx scripts/precache.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const REPOS = [
  { owner: "resend", name: "resend-node" },
  { owner: "resend", name: "resend-py" },
  { owner: "resend", name: "react-email" },
];

async function ingest(owner: string, name: string) {
  console.log(`\n▶ Ingesting ${owner}/${name}…`);
  const start = Date.now();

  const res = await fetch(`${BASE_URL}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, name }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`  ✗ Failed: ${data.error}`);
    return;
  }

  const succeeded = data.results?.filter((r: { status: string }) => r.status === "upserted").length ?? 0;
  const failed = data.results?.filter((r: { status: string }) => r.status === "skipped").length ?? 0;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`  ✓ ${succeeded} PRs ingested, ${failed} skipped — ${elapsed}s`);
}

async function main() {
  console.log(`Pre-caching ${REPOS.length} repos against ${BASE_URL}\n`);

  for (const repo of REPOS) {
    await ingest(repo.owner, repo.name);
  }

  console.log("\n✓ Done. You're ready for the demo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
