# SwiPR

**Swipe-to-review GitHub PRs with AI context. Works as a Claude MCP plugin.**

[Try the live demo →](https://v0-swipr-build.vercel.app)

<!-- Replace this screenshot with your screen recording once you have it. GitHub supports .mp4 embeds. -->
<img width="1646" height="949" alt="SwiPR swipe interface" src="https://github.com/user-attachments/assets/27e194ca-a6dc-4e3a-aead-ea24ca144a9d" />

---

## Why this exists

Zeno Rocha (CEO of [Resend](https://resend.com)) on X:

> *"the cost of opening a PR has dropped to zero. now, we have tons of draft PRs waiting for a finite (and ultra precious) resource: attention. turns out the bottleneck is no longer creation. it's reviewing."*
> — Feb 2026

A few months later:

> *"before our main repo had an average of ~20–40 open PRs on any given day. now, we average ~130–200 open PRs."*
> — May 2026

PR review is a context problem. Whether a maintainer is triaging or an AI agent is deciding whether to merge, the question is the same: *is this safe to ship?* Answering it well requires knowing the risk level, contributor history, similar past changes, and which tests actually cover the diff — not just reading the lines changed.

SwiPR surfaces that context as a swipe UI for humans and an MCP server for agents.

---

## How it works

1. Paste any public GitHub repo — SwiPR ingests open PRs and stores them with embeddings
2. Swipe right to approve, left to request changes, down to skip — or use `J` / `F` / `Space`
3. The right panel surfaces: risk score, AI summary, similar past PRs, contributor history
4. Hit **"Show me callers"**, **"What tests cover this?"**, or **"Why is this risky?"** for deeper context on demand
5. Ask anything in the chat — the AI has access to the full diff and codebase context

AI context is cached per PR at ingest time — no repeated API calls on every card view.

---

## MCP server

SwiPR exposes the same PR context as an MCP server. Add it to Claude Desktop or Cursor and review PRs directly from chat — no browser required.

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "swipr": {
      "command": "npx",
      "args": ["-y", "supergateway", "--streamableHttp", "https://v0-swipr-build.vercel.app/api/mcp"]
    }
  }
}
```

Then ask Claude:
- *"Look up resend/resend-node PR #1247 and tell me the risk score and similar past changes."*
- *"Which open PRs in vercel/next.js touch the router?"*
- *"Find tests that cover the changed files in PR #892."*

**All 12 MCP tools are pure database reads — zero AI credits consumed when you use the hosted server.** The only time credits are used is during ingest (to generate AI summaries) and the in-browser chat feature.

### Available tools

| Tool | What it returns |
|---|---|
| `lookup_pr` | Resolve `owner/repo#number` → internal ID |
| `analyze_pr` | Full PR data: files, patches, risk score, contributor stats, cached summary |
| `risk_score` | 0–100 heuristic score with reasons |
| `find_similar_changes` | Past PRs in the same repo with semantic similarity |
| `get_contributor_history` | PR count, merge rate, first contribution date |
| `inspect_file` | Raw file content at HEAD |
| `find_callers` | Search patches for usages of a function name |
| `find_related_tests` | Test files that likely cover the changed code |
| `git_blame_summary` | Recent contributors to a file path |
| `compare_with` | File content at an arbitrary git ref |
| `record_decision` | Capture approve / changes / skip |
| `summarize_session` | End-of-session stats |

### Using SwiPR as a plugin

SwiPR is listed on [smithery.ai](https://smithery.ai/server/swipr) and [mcp.so](https://mcp.so/server/swipr). If your MCP client has a plugin directory, search for **SwiPR**. If you're self-hosting, point the URL at your own deployment instead of the shared one.

---

## Customizing risk scoring

The risk heuristic lives entirely in [`lib/scoring.ts`](lib/scoring.ts). It's plain TypeScript — no ML, no external calls. Edit it freely to match your team's standards.

The default rules:

| Signal | Score added | Notes |
|---|---|---|
| Large diff (>500 lines) | +20 | |
| Medium diff (200–500 lines) | +10 | |
| Many files (>20) | +15 | |
| Touches config/lock/CI files | +20 | `HIGH_RISK_FILENAMES` regex list |
| No test files changed (>3 files) | +10 | |
| Empty PR description | +10 | |
| First-time contributor | +15 | |
| New contributor (<3 prior PRs) | +8 | |
| Low historical merge rate (<40%) | +10 | Only for contributors with ≥5 PRs |

**To add a new rule**, add an `if` block in `computeRiskScore` that increments `score` and pushes a string to `reasons`. Example — penalizing PRs that touch a core auth module:

```ts
const touchesAuth = files.some((f) => f.filename.includes("lib/auth"));
if (touchesAuth) {
  score += 25;
  reasons.push("Touches auth module — requires security review");
}
```

**To add a new high-risk filename pattern**, append a regex to `HIGH_RISK_FILENAMES`:

```ts
const HIGH_RISK_FILENAMES = [
  // ...existing patterns...
  /secrets\.ts$/,
  /\.pem$/,
  /migrations\//,   // treat any DB migration as high-risk
];
```

The score is capped at 100 by `Math.min(score, 100)`. Thresholds (green/yellow/red in the UI) are at 40 and 70 — adjust those in [`app/swipe/_components/view-helpers.ts`](app/swipe/_components/view-helpers.ts) if you change the scoring scale.

---

## Self-hosting

SwiPR requires three services. All have free tiers that cover personal use.

### 1. Clone and install

```bash
git clone https://github.com/nochinxx/SwiPR.git
cd SwiPR
pnpm install
```

### 2. Create accounts

| Service | Purpose | Free tier |
|---|---|---|
| [Neon](https://neon.tech) | Postgres + pgvector | 512 MB storage |
| [Vercel AI Gateway](https://vercel.com/ai-gateway) | Claude + embeddings | $5 free credits |
| GitHub PAT (optional) | Higher API rate limits | Free, no scopes needed |

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
DATABASE_URL=postgresql://...      # Neon pooled connection string
AI_GATEWAY_API_KEY=...             # Vercel AI Gateway key
GITHUB_TOKEN=...                   # GitHub PAT — optional, raises rate limit to 5000/hr
```

### 4. Initialize the database

In the Neon SQL editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then push the schema:

```bash
pnpm db:push
```

Add HNSW indexes for fast similarity search (Neon SQL editor):

```sql
CREATE INDEX IF NOT EXISTS prs_embedding_idx ON prs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS pr_files_embedding_idx ON pr_files USING hnsw (embedding vector_cosine_ops);
```

### 5. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Pre-cache repos (optional but recommended)

Pre-load repos so the first swipe session is instant:

```bash
pnpm precache
```

Edit `scripts/precache.ts` to change which repos are pre-cached.

### 7. Deploy to Vercel

Push to GitHub and connect the repo to a Vercel project. Set the same environment variables in Vercel project settings.

Point your Claude Desktop config at your own deployment URL instead of the shared one.

### Bring your own Anthropic key (BYOK)

Click the `⌘` button in the header and paste a key from [console.anthropic.com](https://console.anthropic.com/settings/keys). Stored in your browser's localStorage only — never sent to the server.

---

## Storage limits

Neon's free tier holds ~512 MB. Each ingested PR uses roughly 100 KB (embeddings + patches + metadata). That's around 5,000 PRs or 40–50 mid-sized repos before you'd need to upgrade.

Ingest is capped at 100 open PRs per repo. Very large repos (kubernetes, chromium) won't blow up your database.

---

## Stack

- **Next.js 16** — App Router, React 19
- **Tailwind v4** + **shadcn/ui** — styling
- **Framer Motion** — card animations
- **Neon Postgres** + **pgvector** — PR storage and similarity search
- **Drizzle ORM** — schema and queries
- **Vercel AI Gateway** — Claude Sonnet 4.6 (analysis), text-embedding-3-small (vectors)
- **@ai-sdk/anthropic** — direct Anthropic calls for BYOK chat
- **mcp-handler** — MCP server at `/api/mcp`

---

## Contributing

Issues and PRs welcome.

- The stack is Next.js App Router + Drizzle + Neon + Vercel AI SDK. No other ORM or database abstractions.
- Risk scoring lives in `lib/scoring.ts` — contributions to improve the heuristics are especially welcome.
- Keep the visual identity consistent — colors and animation specs are in the codebase comments.
- Don't add the GitHub OAuth flow or actual PR posting. Read-only access is intentional.
- Run `pnpm build` before opening a PR.

```bash
pnpm dev        # local dev server
pnpm build      # production build check
pnpm db:push    # push schema changes to Neon
pnpm precache   # pre-load repos into the database
```
