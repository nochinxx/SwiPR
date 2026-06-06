'use client'

import { useMemo } from 'react'
import type { PullRequest } from '../_types'
import { localRiskScore, riskColor, CATEGORY_ORDER, CATEGORY_STYLE, inferCategory } from './view-helpers'

interface Props {
  prs: PullRequest[]
  currentIndex: number
  onSelect: (index: number) => void
}

export function ViewCategoryGroup({ prs, currentIndex, onSelect }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, { pr: PullRequest; i: number }[]>()
    prs.forEach((pr, i) => {
      const cat = inferCategory(pr)
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push({ pr, i })
    })
    const ordered = CATEGORY_ORDER.filter((k) => map.has(k)).map((k) => ({
      category: k,
      entries: map.get(k)!,
    }))
    const extra = [...map.entries()]
      .filter(([k]) => !CATEGORY_ORDER.includes(k))
      .map(([k, v]) => ({ category: k, entries: v }))
    return [...ordered, ...extra]
  }, [prs])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6">
        {groups.map(({ category, entries }) => {
          const style = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.Other
          return (
            <div key={category}>
              <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${style.header}`}>
                <div className={`size-2 rounded-full ${style.dot}`} />
                <span className="text-sm font-semibold">{category}</span>
                <span className="ml-auto font-mono text-xs opacity-60">{entries.length}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map(({ pr, i }) => {
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
          )
        })}
      </div>
    </div>
  )
}
