'use client'

import { ChevronUp } from 'lucide-react'
import type { SessionStats, SwipeAction } from '../_types'

interface BottomStripProps {
  stats: SessionStats
  onFilterClick?: (action: SwipeAction) => void
}

export function BottomStrip({ stats, onFilterClick }: BottomStripProps) {
  const isClickable = !!onFilterClick

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-t border-border bg-background/80 backdrop-blur-sm px-4 lg:px-8">
      {/* Left: Session stats - clickable counters */}
      <div className="flex items-center font-mono text-sm text-muted-foreground">
        <button
          onClick={() => onFilterClick?.('approve')}
          disabled={!isClickable}
          className={`flex items-center gap-1 text-[#22C55E] ${isClickable ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
        >
          <span>✓ {stats.approved}</span>
          {isClickable && <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" />}
        </button>
        <span className="mx-2 text-muted-foreground/60">approved ·</span>
        <button
          onClick={() => onFilterClick?.('changes')}
          disabled={!isClickable}
          className={`flex items-center gap-1 text-[#DC2626] ${isClickable ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
        >
          <span>x {stats.changesRequested}</span>
          {isClickable && <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" />}
        </button>
        <span className="mx-2 text-muted-foreground/60">changes ·</span>
        <button
          onClick={() => onFilterClick?.('skip')}
          disabled={!isClickable}
          className={`flex items-center gap-1 text-[#D97706] ${isClickable ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
        >
          <span>↓ {stats.skipped}</span>
          {isClickable && <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" />}
        </button>
        <span className="ml-2 text-muted-foreground/60">skipped</span>
      </div>

      {/* Right: Summary button */}
      <button className="rounded-lg border border-border bg-card px-4 py-2 font-mono text-sm text-foreground transition-colors hover:bg-secondary">
        Generate review summary
      </button>
    </footer>
  )
}
