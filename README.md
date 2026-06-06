# SwiPR

**Swipe-to-review GitHub PRs with AI context. Works as a Claude MCP plugin.**

[Try the live demo →](https://v0-swipr-build.vercel.app) · [Add to Claude Desktop ↓](#mcp-server)

<img width="1646" height="949" alt="SwiPR swipe interface" src="https://github.com/user-attachments/assets/27e194ca-a6dc-4e3a-aead-ea24ca144a9d" />

---

## MCP server

Connect SwiPR to Claude Desktop and review PRs directly from chat — same context, no browser required.

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

> The hosted MCP server runs on shared credits. For unthrottled use, [self-host with your own API key](#self-hosting).

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
4. Ask deeper questions in the chat — the AI has access to the full diff and codebase context
5. The footer tracks your decisions; click any counter to review them

AI context is cached per PR at ingest time — no repeated API calls on every card view.

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

ALTER TABLE prs ADD COLUMN IF NOT EXISTS ai_summary text[];
ALTER TABLE prs ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamp;
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

The live demo and hosted MCP run on shared AI credits. For the **chat** feature specifically, you can use your own Anthropic key — it's never stored on the server.

Click the `⌘` button in the header and paste a key from [console.anthropic.com](https://console.anthropic.com/settings/keys). Stored in your browser's localStorage only.

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

## MCP tools

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

---

## Contributing

Issues and PRs are welcome. A few things to know before contributing:

- **AGENTS.md** is the single source of truth for project state, decisions, and architecture. Read it first.
- The stack is Next.js App Router + Drizzle + Neon + Vercel AI SDK. No other ORM or database abstractions.
- Keep the visual identity consistent — colors and animation specs are locked in AGENTS.md under "Visual identity."
- Don't add the GitHub OAuth flow or actual PR posting. Read-only access is intentional.
- Run `pnpm build` before opening a PR.

```bash
pnpm dev        # local dev server
pnpm build      # production build check
pnpm db:push    # push schema changes to Neon
pnpm precache   # pre-load repos into the database
```
