'use client'

import type { PullRequest } from '../_types'
import { localRiskScore, riskColor } from './view-helpers'

interface Props {
  readonly prs: PullRequest[]
  readonly currentIndex: number
  readonly onSelect: (index: number) => void
}

const BUCKETS = [
  {
    label: 'High',
    header: 'bg-red-500/10 text-red-500 border-red-500/20',
    dot: 'bg-red-500',
    filter: (s: number) => s >= 70,
  },
  {
    label: 'Medium',
    header: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dot: 'bg-amber-500',
    filter: (s: number) => s >= 40 && s < 70,
  },
  {
    label: 'Low',
    header: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20',
    dot: 'bg-[#22C55E]',
    filter: (s: number) => s < 40,
  },
]

export function ViewRiskMatrix({ prs, currentIndex, onSelect }: Props) {
  const scored = prs.map((pr, i) => ({ pr, i, score: localRiskScore(pr) }))

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      {BUCKETS.map(({ label, header, dot, filter }) => {
        const items = scored.filter((s) => filter(s.score))
        if (items.length === 0) return null
        return (
          <div key={label}>
            <div className={`mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 ${header}`}>
              <div className={`size-2 rounded-full ${dot}`} />
              <span className="text-sm font-semibold">{label}</span>
              <span className="ml-auto font-mono text-xs opacity-60">{items.length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {items.map(({ pr, i, score }) => (
                <button
                  key={pr.id}
                  onClick={() => onSelect(i)}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-xs transition-all hover:shadow-sm ${
                    i === currentIndex
                      ? 'border-[#22C55E] bg-[#22C55E]/5 ring-1 ring-[#22C55E]/30'
                      : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                >
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">#{pr.number}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{pr.title}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    +{pr.additions} −{pr.deletions}
                  </span>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${riskColor(score)}`}>
                    {score}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
