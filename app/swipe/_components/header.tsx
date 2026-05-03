'use client'

import { useState } from 'react'

interface HeaderProps {
  currentPR: number
  totalPRs: number
  streak: number
  defaultRepo?: string
}

export function Header({ currentPR, totalPRs, streak, defaultRepo = '' }: HeaderProps) {
  const [repo, setRepo] = useState(defaultRepo)

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
      {/* Left: Wordmark */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#16A34A] text-lg">•</span>
        <span className="font-mono text-lg font-bold tracking-tight text-[#0A0A0A]">SwiPR</span>
      </div>

      {/* Center: Repo input */}
      <div className="hidden flex-1 justify-center px-8 md:flex">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo (e.g. resend/resend-node)"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 pr-16 font-mono text-sm text-[#0A0A0A] placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
            ↵ load
          </span>
        </div>
      </div>

      {/* Right: Progress + Streak */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm text-slate-600">
          PR {currentPR} of {totalPRs}
        </span>
        {streak >= 2 && (
          <span className="text-sm text-slate-500">
            🔥 {streak} in a row
          </span>
        )}
      </div>
    </header>
  )
}
