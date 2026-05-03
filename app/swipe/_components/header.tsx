'use client'

import { useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'

interface HeaderProps {
  currentPR: number
  totalPRs: number
  streak: number
  defaultRepo?: string
  onToggleHints?: () => void
}

export function Header({ currentPR, totalPRs, streak, defaultRepo = '', onToggleHints }: HeaderProps) {
  const [repo, setRepo] = useState(defaultRepo)

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-8">
      {/* Left: Wordmark */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#22C55E] text-lg">•</span>
        <span className="font-mono text-lg font-bold tracking-tight text-foreground">SwiPR</span>
      </div>

      {/* Center: Repo input */}
      <div className="hidden flex-1 justify-center px-8 md:flex">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo (e.g. resend/resend-node)"
            className="w-full rounded-full border border-border bg-background px-4 py-2 pr-16 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
            ↵ load
          </span>
        </div>
      </div>

      {/* Right: Progress + Streak + Hints + Theme */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">
          PR {currentPR} of {totalPRs}
        </span>
        {streak >= 2 && (
          <span className="text-sm text-muted-foreground">
            {streak} in a row
          </span>
        )}
        <button
          onClick={onToggleHints}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          aria-label="Keyboard shortcuts"
        >
          ?
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
