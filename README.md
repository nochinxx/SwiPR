# SwiPR

**Swipe-to-review GitHub PRs with AI context. Works as a Claude MCP plugin.**

[Try the live demo →](https://v0-swipr-build.vercel.app) · [Add to Claude Desktop ↓](#mcp-server) · [Listed on smithery.ai](https://smithery.ai/server/mariojillesca/swipr)

[![SwiPR demo](https://img.youtube.com/vi/FTMN8_TVLn8/maxresdefault.jpg)](https://www.youtube.com/watch?v=FTMN8_TVLn8)


---

## Why this exists

Zeno Rocha (CEO of [Resend](https://resend.com)) on X:

> *"the cost of opening a PR has dropped to zero. now, we have tons of draft PRs waiting for a finite (and ultra precious) resource: attention. turns out the bottleneck is no longer creation. it's reviewing."*
> — Feb 2026

> *"before our main repo had an average of ~20–40 open PRs on any given day. now, we average ~130–200 open PRs."*
> — May 2026

PR review is a context problem. Whether a maintainer is triaging or an AI agent is deciding whether to merge, the question is the same: *is this safe to ship?* Answering it well requires knowing the risk level, contributor history, similar past changes, and which tests cover the diff — not just reading the lines changed.

SwiPR surfaces that context as a swipe UI for humans and an MCP server for agents.

---

## How it works

1. Paste any public GitHub repo — SwiPR fetches open PRs and stores them with embeddings
2. Swipe right to approve, left to request changes, down to skip — or use `J` / `F` / `Space`
3. The right panel surfaces: risk score, AI summary, similar past PRs, contributor history
4. Hit **"Why is this risky?"**, **"Show me callers"**, or **"What tests cover this?"** for deeper context on demand
5. Ask anything in the chat — the AI has access to the full diff and codebase context

AI context is cached per PR — no repeated API calls on every card view.

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
- *"Look up resend/resend-node PR #1247 — what's the risk and are there similar past changes?"*
- *"Which open PRs in vercel/next.js touch the router?"*
- *"Find tests that cover the changed files in PR #892."*

**All 12 MCP tools are pure database reads — zero AI credits consumed when using the hosted server.**

SwiPR is listed on [smithery.ai](https://smithery.ai/server/mariojillesca/swipr) and [mcp.so](https://mcp.so/server/swipr/nochinxx).

### Available tools

| Tool | What it returns |
|---|---|
| `lookup_pr` | Resolve `owner/repo#number` → internal ID |
| `analyze_pr` | Full PR data: files, patches, risk score, contributor stats, cached AI summary |
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

---

## Bring your own AI key

The chat feature works with any of these free-tier providers — click the `⌘` button in the header and paste your key. It's stored in your browser's localStorage only, never sent to the server.

| Provider | Key format | Free tier |
|---|---|---|
| [Groq](https://console.groq.com/keys) | `gsk_...` | Yes — Llama 3.3 70B |
| [Google Gemini](https://aistudio.google.com/apikey) | `AIza...` | Yes — Gemini 2.0 Flash |
| [Anthropic](https://console.anthropic.com/settings/keys) | `sk-ant-...` | Paid — Claude Sonnet 4.6 |

---

## Customizing risk scoring

The risk heuristic lives entirely in [`lib/scoring.ts`](lib/scoring.ts) — plain TypeScript, no ML, no external calls. Edit it to match your team's standards.

Default rules:

| Signal | Score |
|---|---|
| Large diff (>500 lines) | +20 |
| Medium diff (200–500 lines) | +10 |
| Many files changed (>20) | +15 |
| Touches config/lock/CI files | +20 |
| No test files changed | +10 |
| Empty PR description | +10 |
| First-time contributor | +15 |
| New contributor (<3 prior PRs) | +8 |
| Low historical merge rate (<40%) | +10 |

To add a rule, add an `if` block in `computeRiskScore`:

```ts
const touchesAuth = files.some((f) => f.filename.includes("lib/auth"));
if (touchesAuth) {
  score += 25;
  reasons.push("Touches auth module — requires security review");
}
```

Score is capped at 100. Color thresholds (green/yellow/red) are at 40 and 70 — adjust in [`app/swipe/_components/view-helpers.ts`](app/swipe/_components/view-helpers.ts).

---

## Self-hosting

Requires three services — all have free tiers.

### 1. Clone and install

```bash
git clone https://github.com/nochinxx/SwiPR.git
cd SwiPR
pnpm install
```

### 2. Create accounts

| Service | Purpose | Free tier |
|---|---|---|
| [Neon](https://neon.tech) | Postgres + pgvector | 512 MB |
| [Vercel AI Gateway](https://vercel.com/ai-gateway) | Claude + embeddings | $5 credits |
| GitHub PAT (optional) | Higher API rate limits | Free |

### 3. Configure environment

```bash
cp .env.example .env.local
```

```env
DATABASE_URL=postgresql://...      # Neon pooled connection string
AI_GATEWAY_API_KEY=...             # Vercel AI Gateway key
GITHUB_TOKEN=...                   # Optional — raises GitHub rate limit to 5000/hr
```

### 4. Initialize the database

```sql
-- Run in Neon SQL editor
CREATE EXTENSION IF NOT EXISTS vector;
```

```bash
pnpm db:push
```

```sql
-- Add HNSW indexes for fast similarity search
CREATE INDEX IF NOT EXISTS prs_embedding_idx ON prs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS pr_files_embedding_idx ON pr_files USING hnsw (embedding vector_cosine_ops);
```

### 5. Run and deploy

```bash
pnpm dev          # local dev
pnpm build        # verify before deploying
pnpm precache     # pre-load repos for a demo
```

Push to GitHub, connect to a Vercel project, set the same env vars in Vercel settings. Point your Claude Desktop config at your own deployment URL.

---

## Storage limits

Neon's free tier holds ~512 MB. Each ingested PR uses ~100 KB. That's around 5,000 PRs or 40–50 mid-sized repos before needing an upgrade. Ingest is capped at 100 open PRs per repo.

---

## Stack

- **Next.js 16** — App Router, React 19
- **Tailwind v4** + **shadcn/ui** — styling
- **Framer Motion** — card animations
- **Neon Postgres** + **pgvector** — PR storage and similarity search
- **Drizzle ORM** — schema and queries
- **Vercel AI Gateway** — Claude Sonnet 4.6 (analysis), text-embedding-3-small (vectors)
- **@ai-sdk/anthropic · @ai-sdk/google · @ai-sdk/groq** — BYOK chat support
- **mcp-handler** — MCP server at `/api/mcp`

---

## Contributing

Issues and PRs welcome.

- Stack is Next.js App Router + Drizzle + Neon + Vercel AI SDK — no other abstractions.
- Risk scoring in `lib/scoring.ts` — heuristic improvements especially welcome.
- Don't add GitHub OAuth or actual PR posting. Read-only access is intentional.
- Run `pnpm build` before opening a PR.
