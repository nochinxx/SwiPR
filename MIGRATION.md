# SwiPR bootstrap — migration guide

This folder is a staging area for the SwiPR project. Once v0 generates the
UI and pushes to GitHub, you'll clone that repo locally and copy the right
files from this folder into it.

## What's in here

```
swipr-bootstrap/
├── README.md              ← public-facing — copy to repo root
├── LICENSE                ← MIT, copy to repo root
├── .gitignore             ← professional ignore list — replace v0's
├── AGENTS.md              ← agent memory, copy to repo root
├── CLAUDE.md              ← Claude Code pointer, copy to repo root
├── .agent/
│   └── prompts/
│       └── v0-01-card-stack.md   ← v0 prompt; tucked into .agent/ so it's
│                                   available to future agents but doesn't
│                                   clutter the repo root
├── social/                ← stays HERE; not copied to public repo
│   ├── linkedin.md        ← launch post draft
│   └── x.md               ← X thread draft
└── MIGRATION.md           ← this file; not copied
```

## Files that go INTO the public SwiPR repo

| Source (this folder) | Destination in SwiPR repo |
| --- | --- |
| `README.md` | `README.md` (replaces v0's default) |
| `LICENSE` | `LICENSE` |
| `.gitignore` | `.gitignore` (replaces v0's minimal one) |
| `AGENTS.md` | `AGENTS.md` |
| `CLAUDE.md` | `CLAUDE.md` |
| `.agent/prompts/v0-01-card-stack.md` | `.agent/prompts/v0-01-card-stack.md` |

## Files that stay HERE (private to you)

- `social/linkedin.md` — your launch post; edit and post when ready
- `social/x.md` — your launch thread
- `MIGRATION.md` — this file

## Workflow

```bash
# 1. Create the GitHub repo (after v0 pushes its UI to it)
#    OR: have v0's "Push to GitHub" do the create step

# 2. Clone the repo locally
cd ~/Documents/Claude/Projects/v0-agent
git clone git@github.com:<your-handle>/swipr.git
cd swipr
# now you have v0's generated UI on disk

# 3. Copy the bootstrap files in
cp ../swipr-bootstrap/README.md ./
cp ../swipr-bootstrap/LICENSE ./
cp ../swipr-bootstrap/.gitignore ./
cp ../swipr-bootstrap/AGENTS.md ./
cp ../swipr-bootstrap/CLAUDE.md ./
mkdir -p .agent
cp -r ../swipr-bootstrap/.agent/* .agent/

# 4. Replace REPLACE → your handle in README.md
#    (edits the deploy button URL and the clone URL)
# macOS:
sed -i '' 's|REPLACE|<your-handle>|g' README.md
# Linux:
# sed -i 's|REPLACE|<your-handle>|g' README.md

# 5. Commit the bootstrap layer
git add .
git commit -m "chore: bootstrap repo structure (README, LICENSE, AGENTS.md)"
git push origin main
```

After the push, Vercel auto-deploys and the polished README shows on the
repo home page. Stars become possible.

## Then: switch to Claude Code

```bash
cd ~/Documents/Claude/Projects/v0-agent/swipr
claude
```

Claude Code reads `CLAUDE.md` automatically (which points to `AGENTS.md`).
First message:

> Read AGENTS.md and tell me where to pick up. Don't start work until I confirm direction.

## When the project ships, delete this folder

This bootstrap folder exists only to bridge the gap before the SwiPR repo
exists. Once everything's copied in and committed, delete it:

```bash
rm -rf ~/Documents/Claude/Projects/v0-agent/swipr-bootstrap
```

Optional: keep `social/` somewhere personal until the launch posts go live.
