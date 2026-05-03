'use client'

import type { SessionStats } from '../_types'

interface BottomStripProps {
  stats: SessionStats
}

export function BottomStrip({ stats }: BottomStripProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-t border-border bg-background/80 backdrop-blur-sm px-4 lg:px-8">
      {/* Left: Session stats */}
      <div className="font-mono text-sm text-muted-foreground">
        <span className="text-[#22C55E]">✓ {stats.approved}</span>
        <span className="mx-2 text-muted-foreground/60">approved ·</span>
        <span className="text-[#DC2626]">x {stats.changesRequested}</span>
        <span className="mx-2 text-muted-foreground/60">changes ·</span>
        <span className="text-amber-500">↓ {stats.skipped}</span>
        <span className="ml-2 text-muted-foreground/60">skipped</span>
      </div>

      {/* Right: Summary button */}
      <button className="rounded-lg border border-border bg-card px-4 py-2 font-mono text-sm text-foreground transition-colors hover:bg-secondary">
        Generate review summary
      </button>
    </footer>
  )
}
