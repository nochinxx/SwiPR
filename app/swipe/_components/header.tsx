'use client'

import { useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'

interface HeaderProps {
  currentPR: number
  totalPRs: number
  streak: number
  defaultRepo?: string
  byokKey?: string | null
  onToggleHints?: () => void
  onRepoSubmit?: (repo: string) => void
  onByokKeyChange?: (key: string) => void
  isLoading?: boolean
}

export function Header({ currentPR, totalPRs, streak, defaultRepo = '', byokKey, onToggleHints, onRepoSubmit, onByokKeyChange, isLoading }: HeaderProps) {
  const [repo, setRepo] = useState(defaultRepo)
  const [keyInputOpen, setKeyInputOpen] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')

  const handleRepoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onRepoSubmit && repo.trim()) {
      onRepoSubmit(repo.trim())
    }
  }

  const handleKeyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (keyDraft.trim()) {
        const key = keyDraft.trim()
        localStorage.setItem('swipr_byok_key', key)
        onByokKeyChange?.(key)
      }
      setKeyInputOpen(false)
      setKeyDraft('')
    } else if (e.key === 'Escape') {
      setKeyInputOpen(false)
      setKeyDraft('')
    }
  }

  const isKeySet = !!byokKey?.startsWith('sk-ant-')

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
            onKeyDown={handleRepoKeyDown}
            placeholder="owner/repo (e.g. resend/resend-node)"
            disabled={isLoading}
            className="w-full rounded-full border border-border bg-background px-4 py-2 pr-16 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
            {isLoading ? 'loading…' : '↵ load'}
          </span>
        </div>
      </div>

      {/* Right: Progress + Streak + Hints + BYOK + Theme */}
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

        {/* BYOK key button + dropdown */}
        <div className="relative">
          <button
            onClick={() => setKeyInputOpen((prev) => !prev)}
            className="relative flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            aria-label={isKeySet ? 'API key set' : 'Add Anthropic API key'}
            title={isKeySet ? 'Anthropic key set — using your key' : 'Add Anthropic API key'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="15.5" r="5.5"/>
              <path d="m21 2-9.6 9.6"/>
              <path d="m15.5 7.5 3 3L22 7l-3-3"/>
            </svg>
            {isKeySet && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#22C55E]" />
            )}
          </button>
          {keyInputOpen && (
            <div className="absolute right-0 top-9 z-50 flex w-72 flex-col gap-1.5 rounded-lg border border-border bg-background p-3 shadow-lg">
              <div className="font-mono text-xs text-muted-foreground">
                Anthropic API key {isKeySet && <span className="text-[#22C55E]">✓ set</span>}
              </div>
              <input
                autoFocus
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={handleKeyInputKeyDown}
                onBlur={() => { setKeyInputOpen(false); setKeyDraft('') }}
                placeholder={isKeySet ? '(enter new key to replace)' : 'sk-ant-...'}
                className="w-full rounded border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="font-mono text-xs text-muted-foreground">↵ save · Esc cancel</div>
            </div>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
