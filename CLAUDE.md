# CLAUDE.md

Read [`AGENTS.md`](./AGENTS.md) first. It's the single source of truth for
this project.

## Claude Code-specific notes

- **Always check `AGENTS.md` Status before starting work.** Move items from
  Pending → Done as you finish them, and add to the Decisions log when you
  make a real choice.
- **Reference Trajectory** at
  `~/Documents/Claude/Projects/v0-agent/trajectory/` for working examples
  of the same stack (Drizzle schema, MCP server with `mcp-handler`,
  AI Gateway client, embedding helpers). Don't reinvent — copy and adapt.
- **Saved v0 prompts** live in `prompts/`. Review them before generating new
  UI so the visual identity stays consistent.
- **Don't commit on behalf of the user.** Vercel's Hobby plan rejects
  deploys from unrecognized commit authors. Have the human run
  `git add && git commit && git push`.
- **Tasks tracking:** if you're using Claude Code's task tools, mirror
  meaningful state changes into AGENTS.md's Status section so future
  sessions (and other tools) see them.

## First-message protocol

If you're a fresh Claude Code session, your first action is:

```
Read AGENTS.md, then list the next 3 tasks I should pick up. Don't start
work until I confirm direction.
```
