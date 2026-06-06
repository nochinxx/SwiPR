'use client'

import type { PullRequest } from '../_types'
import { localRiskScore, riskColor } from './view-helpers'

interface Props {
  prs: PullRequest[]
  currentIndex: number
  onSelect: (index: number) => void
}

export function ViewRiskMatrix({ prs, currentIndex, onSelect }: Props) {
  const scored = prs.map((pr, i) => ({ pr, i, score: localRiskScore(pr) }))
  const high = scored.filter((s) => s.score >= 70)
  const med  = scored.filter((s) => s.score >= 40 && s.score < 70)
  const low  = scored.filter((s) => s.score < 40)

  const columns = [
    { label: 'High', items: high, header: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
    { label: 'Medium', items: med, header: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
    { label: 'Low', items: low, header: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-400' },
  ]

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
      {columns.map(({ label, items, header, dot }) => (
        <div key={label} className="flex min-h-0 flex-1 flex-col gap-2">
          <div className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 ${header}`}>
            <div className={`size-2 rounded-full ${dot}`} />
            <span className="text-sm font-semibold">{label}</span>
            <span className="ml-auto font-mono text-xs opacity-60">{items.length}</span>
          </div>
          <div className="flex flex-col gap-1.5 overflow-y-auto">
            {items.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground/50">None</p>
            )}
            {items.map(({ pr, i, score }) => (
              <button
                key={pr.id}
                onClick={() => onSelect(i)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all hover:shadow-sm ${
                  i === currentIndex
                    ? 'border-[#22C55E] bg-[#22C55E]/5 ring-1 ring-[#22C55E]/30'
                    : 'border-border bg-card hover:border-muted'
                }`}
              >
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">#{pr.number}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{pr.title}</span>
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${riskColor(score)}`}>
                  {score}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
