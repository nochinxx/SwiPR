'use client'

import { useMemo } from 'react'
import type { PullRequest } from '../_types'
import { localRiskScore, riskColor } from './view-helpers'

interface Props {
  prs: PullRequest[]
  currentIndex: number
  onSelect: (index: number) => void
}

export function ViewContributorFocus({ prs, currentIndex, onSelect }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, { handle: string; avatarUrl: string; entries: { pr: PullRequest; i: number }[] }>()
    prs.forEach((pr, i) => {
      const handle = pr.author.handle
      if (!map.has(handle)) {
        map.set(handle, { handle, avatarUrl: pr.author.avatarUrl, entries: [] })
      }
      map.get(handle)!.entries.push({ pr, i })
    })
    return [...map.values()].sort((a, b) => b.entries.length - a.entries.length)
  }, [prs])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <div key={group.handle}>
            <div className="mb-3 flex items-center gap-3">
              {group.avatarUrl ? (
                <img
                  src={group.avatarUrl}
                  alt={group.handle}
                  className="size-8 rounded-full"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {group.handle[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold">{group.handle}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {group.entries.length} PR{group.entries.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid gap-2 pl-11 sm:grid-cols-2 lg:grid-cols-3">
              {group.entries.map(({ pr, i }) => {
                const score = localRiskScore(pr)
                return (
                  <button
                    key={pr.id}
                    onClick={() => onSelect(i)}
                    className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-md ${
                      i === currentIndex
                        ? 'border-[#22C55E] bg-[#22C55E]/5 ring-1 ring-[#22C55E]/30'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">#{pr.number}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskColor(score)}`}>
                        risk {score}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{pr.title}</p>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      +{pr.additions} −{pr.deletions} · {pr.filesChanged}f
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
