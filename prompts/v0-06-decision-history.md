# v0 Prompt — Decision history stack

Add a clickable decision history to the swipe page. The three counters in `BottomStrip` become buttons — clicking one opens a sheet showing all PRs reviewed in that category, color-coded and with direct GitHub links.

---

## Changes required

### 1. `app/swipe/_types.ts` — add DecisionRecord

```typescript
export interface DecisionRecord {
  pr: PullRequest
  action: SwipeAction
  decidedAt: string // ISO timestamp
}
```

### 2. `app/swipe/page.tsx` — track decisions

Add state:
```typescript
const [decisionHistory, setDecisionHistory] = useState<DecisionRecord[]>([])
const [historyFilter, setHistoryFilter] = useState<SwipeAction | null>(null)
```

In `handleSwipe`, after updating stats, push to history:
```typescript
setDecisionHistory(prev => [{
  pr,
  action,
  decidedAt: new Date().toISOString(),
}, ...prev])
```

Pass to `BottomStrip`:
```tsx
<BottomStrip
  stats={stats}
  onFilterClick={(action) => setHistoryFilter(action)}
/>
```

Render the sheet after `<BottomStrip>`:
```tsx
{historyFilter && (
  <DecisionHistory
    decisions={decisionHistory.filter(d => d.action === historyFilter)}
    action={historyFilter}
    onClose={() => setHistoryFilter(null)}
  />
)}
```

Import `DecisionHistory` from `./_components/decision-history`.

### 3. `app/swipe/_components/bottom-strip.tsx` — make counters clickable

Add `onFilterClick?: (action: SwipeAction) => void` to props.

Each counter block becomes a `<button>` with:
- Same visual as before (count + label)
- `onClick={() => onFilterClick?.(action)}`
- `hover:opacity-80 transition-opacity cursor-pointer` when `onFilterClick` is provided
- A subtle upward chevron icon `ChevronUp` (lucide, 10px, muted) to signal it's interactive

The three actions and their colors stay as they are:
- Approved → `text-[#22C55E]`
- Changes → `text-[#DC2626]`
- Skipped → `text-[#D97706]`

### 4. Create `app/swipe/_components/decision-history.tsx`

**Props:**
```typescript
interface DecisionHistoryProps {
  decisions: DecisionRecord[]
  action: SwipeAction
  onClose: () => void
}
```

**Layout:** bottom sheet, same pattern as `MobileContextSheet` (works on all screen sizes, not just mobile):

- Backdrop: `fixed inset-0 z-40 bg-black/50 backdrop-blur-sm`
- Sheet: `fixed bottom-0 left-0 right-0 z-50 max-h-[60vh] rounded-t-2xl border-t border-border bg-background flex flex-col`
- Drag indicator + close button at top
- Scrollable list below

**Header inside the sheet:**

```
[colored dot]  APPROVED  (or CHANGES REQUESTED / SKIPPED)
               12 PRs
```

- Title: `font-mono text-sm font-semibold uppercase tracking-wider` in the action color
- Count: `font-mono text-xs text-muted-foreground`
- Close button: top-right `×`

**Action colors:**
- `approve` → `text-[#22C55E]` + `bg-[#22C55E]` dot
- `changes` → `text-[#DC2626]` + `bg-[#DC2626]` dot
- `skip` → `text-[#D97706]` + `bg-[#D97706]` dot

**PR row (each `DecisionRecord`):**

```
[colored left border]  #1247  feat: add idempotency keys          @maxschmitt  2m ago  ↗
```

- Container: `flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors`
- Left border: `w-1 h-full rounded-r self-stretch` in the action color with 30% opacity
- PR number: `font-mono text-xs text-muted-foreground min-w-[48px]`
- Title: `flex-1 text-sm text-foreground truncate`
- Author: `font-mono text-xs text-muted-foreground` (hidden on small screens)
- Time: `font-mono text-xs text-muted-foreground`
- GitHub link: `ExternalLink` icon (12px), links to `pr.htmlUrl`

**Empty state** (if no decisions yet in this category):
```
No PRs [approved/flagged/skipped] yet.
```
— centered, `font-mono text-sm text-muted-foreground`

**Animation (Framer Motion):**

```typescript
// Backdrop
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}

// Sheet
initial={{ y: "100%" }}
animate={{ y: 0 }}
exit={{ y: "100%" }}
transition={{ type: "spring", stiffness: 300, damping: 30 }}
```

Wrap in `AnimatePresence` at the call site in `page.tsx`.

**Import `AnimatePresence` in `page.tsx`** from `framer-motion` and wrap `{historyFilter && <DecisionHistory ... />}`.

---

## Files to create/update

- **Create:** `app/swipe/_components/decision-history.tsx`
- **Update:** `app/swipe/_components/bottom-strip.tsx` — clickable counters
- **Update:** `app/swipe/_types.ts` — add `DecisionRecord`
- **Update:** `app/swipe/page.tsx` — track history, wire filter state, render sheet
