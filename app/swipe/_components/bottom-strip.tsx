'use client'

import type { SessionStats } from '../_types'

interface BottomStripProps {
  stats: SessionStats
}

export function BottomStrip({ stats }: BottomStripProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-t border-slate-200 bg-white px-4 lg:px-8">
      {/* Left: Session stats */}
      <div className="font-mono text-sm text-slate-600">
        <span className="text-[#16A34A]">✓ {stats.approved}</span>
        <span className="mx-2 text-slate-400">approved ·</span>
        <span className="text-[#DC2626]">✗ {stats.changesRequested}</span>
        <span className="mx-2 text-slate-400">changes ·</span>
        <span className="text-amber-500">↓ {stats.skipped}</span>
        <span className="ml-2 text-slate-400">skipped</span>
      </div>

      {/* Right: Summary button */}
      <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-sm text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50">
        Generate review summary
      </button>
    </footer>
  )
}
