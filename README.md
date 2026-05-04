# SwiPR

A swipe-to-review interface for open-source GitHub pull requests, with AI-powered context and an MCP server that works in Claude Desktop and Cursor.

## Why SwiPR exists

Zeno Rocha (CEO of [Resend](https://resend.com)) put it sharply on X:

> *"the cost of opening a PR has dropped to zero. now, we have tons of draft PRs waiting for a finite (and ultra precious) resource: attention. turns out the bottleneck is no longer creation. it's reviewing."*

Resend's main repo went from 20–40 open PRs per day to 130–200 in a few months. AI ships PRs. Humans don't ship reviews at the same rate. Tests catch a lot, but not intent, architecture, or subtle regressions. The bottleneck has shifted from *writing* code to *reading* code.

SwiPR is built for the moment when you have 30 minutes between meetings and 47 PRs in your queue. Triage fast. Stay informed. Don't rubber-stamp.

## Live demo

**[→ Try SwiPR](https://v0-swipr-build.vercel.app)**

Load any public GitHub repo to start swiping. A good one to try:

```
vercel/next.js
```

> **Note:** The live demo runs on shared infrastructure with limited AI credits. AI analysis and chat may be unavailable or slow during periods of heavy use. For full, unthrottled use, self-host with your own credentials (see below).

## How it works

1. Paste any public GitHub repo URL — SwiPR fetches the open PRs and stores them
2. Swipe right to approve, left to request changes, down to skip (or use J / F / Space)
3. The right panel surfaces context: risk score, what the PR does, similar past changes, contributor history
4. Ask deeper questions in the chat — the AI has access to the full PR diff and codebase context
5. Click any counter in the footer to review your decisions

## MCP server

SwiPR exposes an MCP server at `/api/mcp`. Connect it to Claude Desktop or Cursor to review PRs from your AI chat interface.

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

Then ask Claude: *"Look up vercel/next.js PR #1234, get its risk score, and find similar past changes."*

> **Note:** The MCP server on the live demo uses shared AI credits. For production use, self-host with your own API key.

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
| [Neon](https://neon.tech) | Postgres + pgvector | 0.5 GB storage |
| [Vercel AI Gateway](https://vercel.com/ai-gateway) | Claude + embeddings | $5 free credits |
| GitHub PAT | Higher API rate limits | Free, no scopes needed |

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
DATABASE_URL=postgresql://...      # Neon pooled connection string
AI_GATEWAY_API_KEY=...             # Vercel AI Gateway key
GITHUB_TOKEN=...                   # GitHub PAT (optional, raises rate limit to 5000/hr)
```

### 4. Initialize the database

In the Neon SQL editor, enable pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then push the schema:

```bash
pnpm db:push
```

Add HNSW indexes for fast similarity search (run in Neon SQL editor):

```sql
CREATE INDEX IF NOT EXISTS prs_embedding_idx ON prs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS pr_files_embedding_idx ON pr_files USING hnsw (embedding vector_cosine_ops);
```

### 5. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Pre-cache repos (optional)

Pre-load PR data so the first load is instant:

```bash
pnpm precache
```

Edit `scripts/precache.ts` to change which repos are pre-cached.

### 7. Deploy to Vercel

Push to GitHub and connect the repo to a Vercel project. Set the same environment variables in Vercel's project settings.

## Stack

- **Next.js 16** — App Router, React 19
- **Tailwind v4** + **shadcn/ui** — styling
- **Framer Motion** — card animations
- **Neon Postgres** + **pgvector** — PR storage and similarity search
- **Drizzle ORM** — schema and queries
- **Vercel AI Gateway** — Claude Sonnet 4.6 (analysis + chat), text-embedding-3-small (vectors)
- **mcp-handler** — MCP server at `/api/mcp`
- **v0** — UI generation

## Built with v0

The UI was designed and iterated in [v0](https://v0.app) — Vercel's AI-powered UI generation tool. The component architecture, dark mode, card animations, and layout were all generated and refined through v0 prompts before being wired to the backend.
