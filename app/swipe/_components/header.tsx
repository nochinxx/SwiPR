'use client'

import { useState, useRef, useEffect } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'

interface HeaderProps {
  readonly currentPR: number
  readonly totalPRs: number
  readonly streak: number
  readonly defaultRepo?: string
  readonly apiKey?: string
  readonly onToggleHints?: () => void
  readonly onRepoSubmit?: (repo: string) => void
  readonly onApiKeyChange?: (key: string) => void
  readonly isLoading?: boolean
}

export function Header({ currentPR, totalPRs, streak, defaultRepo = '', apiKey = '', onToggleHints, onRepoSubmit, onApiKeyChange, isLoading }: HeaderProps) {
  const [repo, setRepo] = useState(defaultRepo)
  const [keyOpen, setKeyOpen] = useState(false)
  const [keyDraft, setKeyDraft] = useState(apiKey)
  const keyInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (keyOpen) keyInputRef.current?.focus()
  }, [keyOpen])

  const handleRepoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onRepoSubmit && repo.trim()) {
      onRepoSubmit(repo.trim())
    }
  }

  const handleKeySave = () => {
    onApiKeyChange?.(keyDraft.trim())
    setKeyOpen(false)
  }

  const handleKeyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleKeySave()
    if (e.key === 'Escape') setKeyOpen(false)
  }

  const hasKey = apiKey.length > 0

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

      {/* Right: Progress + Streak + API key + Hints + Theme */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">
          PR {currentPR} of {totalPRs}
        </span>
        {streak >= 2 && (
          <span className="text-sm text-muted-foreground">
            {streak} in a row
          </span>
        )}

        {/* API key button + inline popover */}
        <div className="relative">
          <button
            onClick={() => { setKeyDraft(apiKey); setKeyOpen((v) => !v) }}
            title={hasKey ? 'API key set — chat uses your key' : 'Set an API key for chat (Anthropic, Gemini, or Groq)'}
            className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs transition-colors ${
              hasKey
                ? 'border-[#FF0080] text-[#FF0080] hover:bg-[#FF0080]/10'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            ⌘
          </button>
          {keyOpen && (
            <div className="absolute right-0 top-9 z-50 w-72 rounded-lg border border-border bg-background p-3 shadow-lg">
              <p className="mb-2 font-mono text-xs text-muted-foreground">
                API key for chat — never stored on server. Supports Anthropic, Gemini, or Groq.
              </p>
              <input
                ref={keyInputRef}
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={handleKeyKeyDown}
                placeholder="sk-ant-... / AIza... / gsk_..."
                className="w-full rounded border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-[#FF0080] focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Get a key ↗
                </a>
                <div className="flex gap-2">
                  {hasKey && (
                    <button
                      onClick={() => { onApiKeyChange?.(''); setKeyDraft(''); setKeyOpen(false) }}
                      className="font-mono text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={handleKeySave}
                    className="rounded bg-foreground px-2 py-1 font-mono text-xs text-background hover:opacity-80"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

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
