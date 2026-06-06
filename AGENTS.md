# SwiPR — agent memory

> Single source of truth for any agent (Claude Code, Cursor, Copilot,
> future-Claude after a token-out, you-after-a-coffee) working on SwiPR.
> Read top to bottom before doing anything. Update **Status** and
> **Decisions log** as you go so the next agent doesn't relitigate.

---

## What SwiPR is

A swipe-to-review interface for open-source GitHub Pull Requests, with an MCP
server that surfaces *progressively deeper* context about each PR — risk
score, similar past changes, contributor history, related code, test coverage.
The reviewer can ask for more depth on demand, turning each card into a
"senior eng at your shoulder" experience.

**Goal:** Maximize adoption as a developer tool and Claude MCP plugin.

**Primary surface:** Web UI at v0-swipr-build.vercel.app. Secondary surface:
Claude Desktop / Cursor via the MCP server at `/api/mcp`. Same data, two
surfaces.

**Working name:** SwiPR (Swipe + PR).

---

## The 90-second pitch (LOCK THIS)

> Zeno Rocha (CEO of Resend) on X, Feb 21: *"the cost of opening a PR has dropped to zero. now, we have tons of draft PRs waiting for a finite (and ultra precious) resource: attention. turns out the bottleneck is no longer creation. it's reviewing."*
>
> Then May 1: *"before our main repo had an average of ~20–40 open PRs on any given day. now, we average ~130–200 open PRs."*

> SwiPR is a swipe-to-review interface for open source. Paste a repo URL,
> see the open PRs as a card stack, swipe right to approve, left for changes,
> down to skip. The right rail surfaces context — risk score, what the PR
> actually does, similar past PRs, contributor history.
>
> If you want to dig deeper, ask: *"show me where this function is called"*
> or *"compare to v3.2.0"* — the MCP delivers more depth on demand. That's
> the differentiator: progressive disclosure, not a fixed dashboard.
>
> Same MCP works in Claude Desktop and Cursor. Watch — I'll review the same
> PR from SwiPR (UI) and from Claude Desktop (chat). Same context, two
> surfaces. That's what an MCP is *for*.

The killer demo is two-fold:
1. The **"ask deeper"** interaction during a swipe session — proves the depth
2. **Same MCP from Claude Desktop** — proves the portability

---

## Status

Last updated: 2026-06-06. Update this when you finish work.

### Done — full stack shipped
- Visual identity locked (see **Visual identity** below)
- All UI components: card stack, AI context panel, deeper buttons, chat input,
  mobile sheet, session summary, decision history, keyboard hints overlay
- All backend routes: ingest, prs, context, session, decide, deeper, chat, mcp
- MCP server live at `https://v0-swipr-build.vercel.app/api/mcp` — 12 tools
- Claude Desktop connected via supergateway (see claude_desktop_config.json)
- Cost controls (2026-06-06, Claude Code):
  - AI summary cached in DB at ingest time (`prs.ai_summary`, `prs.ai_analyzed_at`)
  - `/api/context` reads from cache — no Sonnet call on card view if cached
  - MCP tools stripped of internal `generateText` calls — zero gateway cost per tool
  - `/api/chat` BYOK: accepts `x-user-api-key` header, routes to Anthropic directly
  - Header UI: `⌘` button opens API key popover, stored in localStorage
  - Ingest capped at 100 PRs/repo to protect DB storage
- README rewritten for OSS launch: MCP setup first, hackathon framing removed,
  BYOK and storage limits documented, Contributing section added

### Pending — in priority order
1. **DB migration** — run in Neon SQL editor:
   ```sql
   ALTER TABLE prs ADD COLUMN IF NOT EXISTS ai_summary text[];
   ALTER TABLE prs ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamp;
   ```
2. **Mermaid blast-radius panel** — replace raw diff lines in PRCard with an
   impact map: parse changed function names from patch → GitHub Search API for
   callers → render as Mermaid diagram in the AI panel. New files:
   `lib/impact.ts`, `app/swipe/_components/impact-map.tsx`,
   MCP tool `analyze_impact(pr_id)`.
3. **`ingest_repo` + `list_repos` MCP tools** — so the Claude plugin works for
   any repo without pre-ingesting via the web UI.
4. **MCP directory submissions** — smithery.ai, mcp.so, awesome-mcp-servers PR.
5. **Manufact companion package** — thin MCP proxy for self-hosting via Manufact.

### Cut — keep these out
- GitHub OAuth — read-only public is enough
- Posting reviews back to GitHub — show the draft, never post
- Multi-user accounts — single anonymous session is fine
- Branch comparison beyond `main`
- Closed PR crawling

---

## Architecture

**Stack** (all on Vercel):
- Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui (v0-generated)
- Neon Postgres + pgvector (HNSW indexes)
- Drizzle ORM
- Vercel AI Gateway: Sonnet 4.6 (analysis + chat), Haiku 4.5 (bulk tagging),
  `text-embedding-3-small` (1536-dim diff/code embeddings)
- MCP server via `mcp-handler` at `/api/mcp`
- GitHub REST API via `octokit` (no auth for public; optional PAT for higher
  rate limits in dev)

**File map (target):**

```
app/
  swipe/                           ← main demo screen
    page.tsx
    _components/
      header.tsx                   ← logo + repo input + progress + streak
      card-stack.tsx               ← Framer Motion drag, keyboard, peeking cards
      pr-card.tsx                  ← single card: title, body, diff preview, footer
      context-panel.tsx            ← surface tool results (risk, summary, similar, contributor)
      deeper-buttons.tsx           ← quick-action pills
      ask-input.tsx                ← chat input + AI SDK useChat
      session-summary.tsx          ← end-of-session card
      keyboard-hints.tsx           ← J/F/space hint overlay
    _types.ts
  api/
    mcp/route.ts                   ← MCP server (12 tools)
    ingest/route.ts                ← POST {owner, name} → run ingest
    chat/route.ts                  ← AI SDK streamText, MCP tools as function tools
db/
  schema.ts                        ← 7 tables, pgvector cols
  index.ts
  seed.ts                          ← optional pre-cache for Resend repos
lib/
  github.ts                        ← octokit wrapper for fetching PRs/files/diffs
  diff.ts                          ← parse unified diff, count +/- lines, extract function names
  scoring.ts                       ← risk_score heuristic
  ai.ts                            ← AI Gateway client, pre-bound models
  embed.ts                         ← embedText, embedBatch, averageVectors
  types.ts                         ← shared types
.env.example
drizzle.config.ts
AGENTS.md                          ← this file
CLAUDE.md                          ← brief, points here
README.md                          ← public-facing
```

**Database schema (7 tables):**

- `repos` — id, owner, name, default_branch, last_synced
- `prs` — id, repo_id, number, title, body, state, author_handle, additions, deletions, changed_files, created_at, updated_at, html_url, embedding (1536)
- `pr_files` — id, pr_id, filename, status (added|modified|removed), additions, deletions, patch (text), embedding (1536)
- `contributors` — id, repo_id, handle, avatar_url, first_pr_at, total_prs, merged_prs (denormalized cache, refresh on read)
- `decisions` — id, session_id, pr_id, action ('approve'|'changes'|'skip'), note, created_at
- `sessions` — id, started_at, ended_at, decisions_count
- `chat_messages` — id, session_id, pr_id, role ('user'|'assistant'), content, tool_calls (jsonb), created_at

**MCP tool surface (12 tools):**

*Surface tools — auto-call when card becomes active:*

| Tool | What it does |
| --- | --- |
| `analyze_pr(pr_id)` | Sonnet returns 3 bullets describing what the PR does + risk callouts |
| `risk_score(pr_id, verbose?)` | Heuristic 0-100 with rationale; verbose=true returns line-by-line breakdown |
| `find_similar_changes(pr_id, k?)` | Vector search over past PRs in the same repo |
| `get_contributor_history(handle, repo_id)` | Past PRs in this repo + acceptance rate |

*Deeper tools — called on user request via chat or quick buttons:*

| Tool | What it does |
| --- | --- |
| `inspect_file(repo_id, path, question?)` | Read & analyze a specific file |
| `find_callers(repo_id, function_name)` | Semantic search for usages of a function |
| `find_related_tests(pr_id)` | Locate tests covering the changed lines |
| `git_blame_summary(repo_id, path)` | Recent contributors to this file |
| `compare_with(repo_id, pr_id, ref)` | Diff vs an arbitrary git ref (e.g. v3.2.0) |
| `summarize_dependency(repo_id, package_name)` | Context about a third-party dep referenced in the PR |

*State tools:*

| Tool | What it does |
| --- | --- |
| `record_decision(pr_id, action, note?)` | Captures swipe |
| `summarize_session(session_id)` | End-of-session stats + reflection |

---

## Visual identity (LOCK — don't drift)

**Aesthetic philosophy:** Vercel × Resend cross-pollination. Crisp,
taste-forward, dev-flavored. Not generic SaaS, not GitHub-default. The
audience is developers who notice and care about typography.

**Colors:**
- Background: white `#FFFFFF` (or near-white `#FAFAFA` for subtle warmth)
- Ink: near-black `#0A0A0A`, never `#000`
- Borders: hairline 1px in `slate-200` (`#E2E8F0`); no shadows except subtle
  on active drag
- Action colors (GitHub-conventional for instant comprehension):
  - Approve: green `#16A34A`
  - Request changes: red `#DC2626`
  - Skip: amber `#D97706`
- **Brand accent:** hot pink `#FF0080` (Resend-ish). Used ONLY on the "ask
  deeper" surfaces — chat input focus border, deeper-button hover state,
  streak indicator. Makes the experience feel alive without being loud.

**Typography:**
- UI sans: Geist Sans (preferred) or Inter
- Code/diff/numbers/handles/paths: JetBrains Mono
- Section labels: 12px UPPERCASE, tracked, semibold
- Tabular numerals on all stats and counts
- Wordmark "SwiPR": JetBrains Mono Bold 18px, tiny green dot prefix

**Animations:**
- Spring physics, never linear (use Framer Motion)
- Card drag: rotate up to 12° in drag direction
- Color tint fades in on edge cross (green right, red left)
- Card exit: spring + 0.6 opacity fade
- AI panel cards: fade in with 4px translateY, 200ms ease-out
- Streak counter: scale briefly on increment
- Tooltips and reveals: 150ms

**Fun elements** (this is what makes it not feel like Graphite):
- **Streak counter** — appears subtly when streak ≥ 2 ("🔥 3 in a row"),
  unobtrusive but rewarding
- **End-of-session card** — total reviewed, breakdown by action, time spent,
  "approval rate," fastest-decision badge
- **Satisfying card-flick** — the spring + tilt + fade is the central reward
- **Optional sound effects** — off by default, toggleable; soft "tick" on
  decisions, soft "whoosh" on card flick
- **Keyboard shortcuts feel like a power-user tool** — J/F/space hints visible
  on hover; reviewers can clear 50 PRs without touching the mouse

---

## Progressive disclosure — the differentiator

This is the single most important UX detail. The right rail starts with a
fixed set of *surface* context cards: risk, summary, similar PRs,
contributor. When the reviewer wants more, two paths:

### Path 1 — Quick action buttons

Each button calls a deeper MCP tool and renders results inline in the panel:

- **"Why is this risky?"** → `risk_score(pr_id, verbose: true)`
- **"Show me callers"** → `find_callers` for the changed function names
- **"What tests cover this?"** → `find_related_tests`
- **"Compare with main"** → `compare_with(repo_id, pr_id, "main")`

These appear in a "DEEPER" section below the surface cards, styled as small
hot-pink-outlined pills.

### Path 2 — Free-text chat input

At the bottom of the right rail: an `ask-input.tsx` component that wraps
AI SDK's `useChat`. Sends to `/api/chat/route.ts` which uses `streamText`
with the MCP tools registered as function tools. The agent (Sonnet) reasons
over which tools to call and stitches together an answer.

Examples a reviewer might type:
- *"Show me where `sendBatch` is used elsewhere in the codebase"*
- *"Has this contributor done idempotency work before?"*
- *"What's the worst-case if this idempotency key collides?"*
- *"Has this file changed much in the last 6 months?"*

This is the "senior engineer at your shoulder" experience. It's also why
*we* control the MCP — we shape the tools so the agent has the right
primitives to answer real reviewer questions.

---

## What to do next (runbook)

### 1. Read this whole file. Then read `.agent/prompts/v0-01-card-stack.md`.

### 2. Spin up the foundation

```bash
# new GitHub repo
gh repo create <your-handle>/swipr --public --source=. --push
# OR via web UI

# new Vercel project — connect to the repo
# new Neon database — copy the POOLED connection string
# new AI Gateway key — https://vercel.com/ai-gateway
```

Verify by deploying a Hello World Next.js page first. Don't add SwiPR code
until the deploy pipeline is green.

### 3. Generate the UI in v0

Open v0.app, paste `.agent/prompts/v0-01-card-stack.md`. Iterate until the card
animations feel good. Push to GitHub when satisfied.

### 4. Pull v0's output locally

```bash
cd ~/Documents/Claude/Projects/v0-agent
git clone git@github.com:<your-handle>/swipr.git
cd swipr
```

### 5. Add backend scaffolding

The patterns from Trajectory all transfer. Reference files at
`~/Documents/Claude/Projects/v0-agent/trajectory/`:

- `db/schema.ts` — replace tables with SwiPR's 7 (see Architecture)
- `db/index.ts` — copy as-is
- `drizzle.config.ts` — copy as-is
- `lib/ai.ts` — copy as-is (AI Gateway setup is identical)
- `lib/embed.ts` — copy as-is
- `app/api/mcp/route.ts` — replace tools with SwiPR's 12 (see Architecture)
- `package.json` — copy the new deps and scripts (Trajectory has them all)
- `.env.example` — copy

Then run:

```bash
cp .env.example .env.local
# fill in DATABASE_URL (Neon pooled) and AI_GATEWAY_API_KEY
# also: GITHUB_TOKEN (optional for dev, see Gotchas)

# enable pgvector in Neon SQL editor: CREATE EXTENSION IF NOT EXISTS vector;

pnpm install
pnpm run db:push
# add HNSW indexes (see Gotchas)
```

### 6. Build the GitHub ingester

`lib/github.ts` — Octokit wrapper. `fetchOpenPRs(owner, name)` returns the
list. `fetchPRFiles(owner, name, number)` returns files + patches.

`app/api/ingest/route.ts` — POST handler. Body: `{ owner, name }`. Steps:
1. Upsert `repos` row
2. Fetch open PRs
3. For each PR: upsert `prs` row, fetch files, upsert `pr_files`
4. Compute and store contributor cache
5. Embed PR title+body+concatenated patches → `prs.embedding`
6. Embed each file's patch → `pr_files.embedding`

Pre-warm Resend's repos by calling this endpoint manually for `resend/resend-node`,
`resend/resend-py`, and one more.

### 7. Implement surface MCP tools

Use `mcp-handler` exactly like Trajectory. Start with:
- `analyze_pr` — calls Sonnet with PR data, returns 3 bullets
- `risk_score` — heuristic in `lib/scoring.ts`, no LLM needed for the basic
  score; LLM only for verbose rationale
- `find_similar_changes` — pgvector cosine over `prs.embedding` filtered by
  same repo
- `get_contributor_history` — DB lookup + simple stats

### 8. Wire UI side panel to surface tools

`/app/swipe/page.tsx` — server component fetches the active PR and its
surface context (4 parallel tool calls). Pass to `<ContextPanel>` as props.
Cards animate in as data resolves (skeleton → real).

### 9. Implement deeper MCP tools

`inspect_file`, `find_callers`, `find_related_tests`,
`git_blame_summary`, `compare_with`, `summarize_dependency`.

For `find_callers`: pull the file from GitHub, parse with regex (or
ts-morph if time allows), return matching files + line numbers. Don't
overengineer — semantic-ish is fine.

### 10. Implement the "ask deeper" UX

- `<DeeperButtons>` — 4 quick-action pills, each calling its tool and
  rendering result in the panel
- `<AskInput>` — `useChat` from AI SDK, route at `/api/chat/route.ts` using
  `streamText` with all 12 tools registered as function tools

### 11. Pre-cache + demo prep

Hit `/api/ingest` for 3 Resend repos. Record fallback video. Test Claude
Desktop config block:

```json
{
  "mcpServers": {
    "swipr": { "url": "https://<your-vercel-url>/api/mcp" }
  }
}
```

In Claude Desktop, ask: *"Review PR #1247 in resend/resend-node — what's the
risk and similar past changes?"* — confirm it calls the right tools and
returns useful output.

### 12. Polish the pitch

Print the demo script. Rehearse the 90-second pitch 3 times. Open the
fallback video before going on stage.

---

## Switching tools (Cowork ↔ Claude Code)

This project may move between agent surfaces. Continuity comes from:

1. **This AGENTS.md file** — primary. Up-to-date Status + Decisions log.
2. **`CLAUDE.md`** — Claude Code reads this automatically at project root.
   Ours is a brief pointer to AGENTS.md plus Claude-Code-specific notes.
3. **Git history** — clean commits with intent in the message.
4. **`prompts/`** — saved v0 prompts so the next agent doesn't reinvent them.

**No magic state transfer between tools.** The mechanism is always: agent
reads memory file → agent reads code → agent picks up. So:

- **Update this file as you go.** Move tasks from Pending → Done. Add
  decisions when you make them.
- **Commit frequently.** Half of how the next agent figures out what
  happened is `git log`.
- **When switching from Cowork to Claude Code:**
  1. Make sure all current work is committed and pushed
  2. Make sure AGENTS.md is up to date
  3. Open Claude Code in the SwiPR repo: `cd swipr && claude`
  4. Claude Code will auto-read CLAUDE.md
  5. First message to Claude Code: *"Read AGENTS.md and tell me where to
     pick up."*

---

## Decisions log

| Decision | Why |
| --- | --- |
| Pivot from Trajectory to SwiPR | Vercel community judges weight cloneable dev tools. PR review is a real, painful, named bottleneck (Resend has said this publicly). |
| Resend as the demo persona | Open source, well-known in Vercel community, has named the problem publicly via Zeno Rocha (CEO) on X — Feb 21 + May 1, 2026 tweets. Direct quote = built-in credibility. |
| Same stack as Trajectory | Patterns are proven (Drizzle + Neon + pgvector + mcp-handler + AI Gateway all worked). Faster to ship. |
| Read-only GitHub access (no OAuth) | 60/hr is enough for demo with pre-caching. OAuth is hours of friction with no upside for the pitch. |
| Don't actually post reviews back to GitHub | Show the draft. Keeps demo safe and OAuth-free. |
| Single anonymous session (no auth) | Multi-user not part of the pitch. Schema supports it if extended later. |
| 12 MCP tools, split surface (4) + deeper (6) + state (2) | Surface tools auto-call for the rail. Deeper tools demonstrate progressive disclosure — the differentiating feature. |
| Hot pink (#FF0080) only on "ask deeper" surfaces | Different from green/red action colors. Signals "this is interactive, this gives you more." |
| Progressive disclosure via chat + quick buttons | Buttons are discoverable; chat is power. Both present, both work. |
| Spring physics on every animation | Vercel/Resend taste cue. Linear animations betray a lack of care. |
| Pre-cache 3 Resend repos | Demo can't hit GitHub live with bad wifi. Pre-cache eliminates the risk. |
| Use Trajectory's `~/Documents/Claude/Projects/v0-agent/trajectory/` files as reference | Don't reinvent — copy patterns, swap data shapes. |

---

## Gotchas

- **GitHub API rate limit:** unauthenticated is 60 req/hr per IP. For demo,
  pre-cache. For dev, use a personal access token: set `GITHUB_TOKEN` in
  `.env.local` and the Octokit client will pick it up. PATs give 5000/hr.
- **Diff size:** GitHub returns max ~3000 lines of patch per file via PR
  files API. For huge files, request the file directly via Contents API.
- **Embedding cost & latency:** embedding lots of code is slow. Pre-process
  at ingest, never on each card view. Consider only embedding the first
  N changed files per PR if a PR is huge.
- **Wifi:** always have a fallback video. Demo days are cursed.
- **dotenv + drizzle-kit:** use `tsx --env-file=.env.local` for scripts.
  Load `.env.local` explicitly in `drizzle.config.ts`. Don't try
  `import "dotenv/config"` — it reads `.env`, not `.env.local`.
- **mcp-handler version:** moves fast. If install fails, check npm for
  the current major. Default to `latest` and pin after first install.
- **Next.js 16 + Tailwind v4:** v0 will scaffold with these. Don't try to
  add a v3-format `tailwind.config.js`.
- **Vercel Hobby + commit author:** every commit must be authored by a
  GitHub user with team access. Never let an agent commit; always have the
  human run `git commit && git push`. If a bad commit slips through:
  `git commit --amend --reset-author --no-edit && git push --force`.
- **Sandbox can't release `.git/index.lock`:** if git complains about lock,
  run `rm -f .git/index.lock` from a real terminal.
- **HNSW indexes:** Drizzle Kit doesn't generate them. After `db:push`,
  run in Neon SQL editor:

  ```sql
  CREATE INDEX IF NOT EXISTS prs_embedding_idx
    ON prs USING hnsw (embedding vector_cosine_ops);
  CREATE INDEX IF NOT EXISTS pr_files_embedding_idx
    ON pr_files USING hnsw (embedding vector_cosine_ops);
  ```

---

## Account state (fill in as you go)

| Service | Status | Notes |
| --- | --- | --- |
| GitHub repo | ⚠ pending | Will be `<your-handle>/swipr` |
| Vercel project | ⚠ pending | Connect to repo, auto-deploy on push |
| Neon Postgres | ⚠ pending | Pooled connection string (`-pooler` in hostname) |
| AI Gateway | ⚠ pending | Key from vercel.com/ai-gateway |
| GitHub PAT (optional) | ⚠ pending | For dev rate limits — set as `GITHUB_TOKEN` in `.env.local` |
| pgvector extension | ⚠ pending | `CREATE EXTENSION IF NOT EXISTS vector;` |
| Schema pushed | ⚠ pending | `pnpm run db:push` |
| HNSW indexes | ⚠ pending | Two SQL commands in Gotchas |
| Resend repos pre-cached | ⚠ pending | Hit /api/ingest for 3 repos |
| Claude Desktop MCP wired | ⚠ pending | Config block above |

---

## How to update this file

When you finish a meaningful chunk of work:
1. **Status** — move done items, update in-progress
2. **Decisions log** — add the new decision and a one-line *why*
3. **Account state** — flip status when something is configured
4. **Last updated** date at the top of Status

Keep this file under ~600 lines. If it grows past that, split into multiple
docs and link.
