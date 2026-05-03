# v0 Prompt — End-of-session summary card

Create `app/swipe/_components/session-summary.tsx` — a card that replaces the card stack area when the reviewer has gone through all PRs in the queue. Update `app/swipe/page.tsx` to render it when `currentIndex >= prs.length`.

## Component: `SessionSummary`

```typescript
interface SessionSummaryProps {
  stats: {
    approved: number
    changesRequested: number
    skipped: number
    totalReviewed: number
  }
  streak: number
  repoName: string
  onLoadRepo: (repo: string) => void
}
```

## Layout

Replace the card stack area (left column, `w-full lg:w-[60%]`) with this component when the session is complete.

### Top section — the headline stat

Center-aligned:

```
✓ Done
```
— `text-[#16A34A] font-mono text-sm uppercase tracking-widest`

Below that:

```
{totalReviewed} PRs reviewed
```
— `font-mono text-5xl font-bold text-foreground tabular-nums`

### Stats row

Three stat blocks in a horizontal row (flex, gap-4):

Each block: `flex-1 rounded-xl border border-border bg-card p-4 text-center`

| Stat | Value color |
|------|-------------|
| Approved | `text-[#16A34A]` |
| Changes requested | `text-[#DC2626]` |
| Skipped | `text-[#D97706]` |

Value: `font-mono text-3xl font-bold tabular-nums`
Label: `mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground`

### Approval rate bar

```
APPROVAL RATE    72%
[━━━━━━━━━━━━░░░░░░░░] (animated fill)
```

- Label: `font-mono text-xs uppercase tracking-wide text-muted-foreground`
- Rate: `font-mono text-lg font-bold text-foreground tabular-nums`
- Bar: `h-1.5 rounded-full bg-secondary overflow-hidden` with an inner div that animates width from 0 to `${approvalRate}%` with a spring (Framer Motion `animate={{ width: "72%" }}`)
- Bar fill color: `bg-[#16A34A]`

### Badge row (conditional)

Show badges if applicable:

- 🔥 **Streak badge** — if `streak >= 5`: `${streak} review streak` — pill with `border border-orange-500/30 bg-orange-500/10 text-orange-500 font-mono text-xs px-3 py-1 rounded-full`
- **All reviewed** — always show: `All open PRs reviewed` — same pill style with green

### CTA — load another repo

```
Load another repo:
[input: owner/repo placeholder]  [Load PRs →]
```

- Input: same style as the header repo input — `rounded-full border border-border bg-background px-4 py-2 font-mono text-sm text-foreground`
- Button: `rounded-full bg-foreground px-4 py-2 text-sm font-mono font-medium text-background hover:opacity-90`
- On submit: calls `onLoadRepo(repoInput)`

### Footer note

```
J · approve   F · changes   Space · skip
```
— `font-mono text-xs text-muted-foreground text-center mt-4`

## Entrance animation (Framer Motion)

The whole card enters with:
```typescript
initial={{ opacity: 0, y: 24 }}
animate={{ opacity: 1, y: 0 }}
transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.1 }}
```

Individual stat blocks stagger in with `delay: 0.05 * index`.

## Dark mode

All semantic tokens only. Action colors (`#16A34A`, `#DC2626`, `#D97706`) are fixed and intentional — don't adapt them.

## Files to create/update

- **Create:** `app/swipe/_components/session-summary.tsx`
- **Update:** `app/swipe/page.tsx` — render `<SessionSummary>` instead of `<CardStack>` + `<ActionButtons>` when `currentIndex >= MOCK_PRS.length`
