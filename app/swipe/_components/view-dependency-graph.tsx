'use client'

import { useMemo } from 'react'
import type { PullRequest } from '../_types'
import { localRiskScore, riskColor } from './view-helpers'

const NW = 148
const NH = 58
const CG = 96
const RG = 16
const PAD = 24

interface Props {
  prs: PullRequest[]
  currentIndex: number
  onSelect: (index: number) => void
}

function parseDeps(pr: PullRequest, allNums: Set<number>): { hard: number[]; soft: number[] } {
  const text = `${pr.title ?? ''} ${pr.body ?? ''}`
  const hard = new Set<number>()
  const soft = new Set<number>()
  const hardRe = /(?:depends?\s+on|blocked?\s+by|requires?|needs?|stacked?\s+on|after|part\s+of)\s+#(\d+)/gi
  let m: RegExpExecArray | null
  while ((m = hardRe.exec(text)) !== null) {
    const n = parseInt(m[1])
    if (allNums.has(n) && n !== pr.number) hard.add(n)
  }
  const softRe = /#(\d+)/g
  while ((m = softRe.exec(text)) !== null) {
    const n = parseInt(m[1])
    if (allNums.has(n) && n !== pr.number && !hard.has(n)) soft.add(n)
  }
  return { hard: [...hard], soft: [...soft] }
}

function nodeStyle(score: number) {
  if (score >= 70) return { fill: '#fef2f2', stroke: '#dc2626' }
  if (score >= 40) return { fill: '#fffbeb', stroke: '#d97706' }
  return { fill: '#f0fdf4', stroke: '#16a34a' }
}

export function ViewDependencyGraph({ prs, currentIndex, onSelect }: Props) {
  const indexByNumber = useMemo(() => {
    const m = new Map<number, number>()
    prs.forEach((pr, i) => m.set(pr.number, i))
    return m
  }, [prs])

  const allNums = useMemo(() => new Set(prs.map((p) => p.number)), [prs])

  const deps = useMemo(() => {
    const map = new Map<number, { hard: number[]; soft: number[] }>()
    for (const pr of prs) map.set(pr.number, parseDeps(pr, allNums))
    return map
  }, [prs, allNums])

  const reverseDeps = useMemo(() => {
    const map = new Map<number, Set<number>>()
    for (const pr of prs) map.set(pr.number, new Set())
    for (const [num, { hard, soft }] of deps) {
      for (const dep of [...hard, ...soft]) map.get(dep)?.add(num)
    }
    return map
  }, [deps, prs])

  const { layers } = useMemo(() => {
    const inDeg = new Map<number, number>()
    for (const pr of prs) {
      const { hard, soft } = deps.get(pr.number) ?? { hard: [], soft: [] }
      inDeg.set(pr.number, hard.length + soft.length)
    }
    const layers: number[][] = []
    const layerOf = new Map<number, number>()
    let queue = prs.filter((p) => (inDeg.get(p.number) ?? 0) === 0).map((p) => p.number)
    const visited = new Set<number>()
    while (queue.length > 0) {
      const li = layers.length
      layers.push([...queue])
      for (const n of queue) { visited.add(n); layerOf.set(n, li) }
      const next: number[] = []
      for (const node of queue) {
        for (const dep of reverseDeps.get(node) ?? []) {
          if (!visited.has(dep)) {
            const nd = (inDeg.get(dep) ?? 1) - 1
            inDeg.set(dep, nd)
            if (nd === 0) next.push(dep)
          }
        }
      }
      queue = next
    }
    const remaining = prs.filter((p) => !visited.has(p.number)).map((p) => p.number)
    if (remaining.length) { layers.push(remaining); remaining.forEach((n) => layerOf.set(n, layers.length - 1)) }
    return { layers }
  }, [prs, deps, reverseDeps])

  const connected = useMemo(() => {
    const s = new Set<number>()
    for (const [num, { hard, soft }] of deps) {
      if (hard.length + soft.length > 0) { s.add(num); for (const n of [...hard, ...soft]) s.add(n) }
    }
    return s
  }, [deps])

  const independent = useMemo(() => prs.filter((p) => !connected.has(p.number)), [prs, connected])
  const graphPRs = useMemo(() => prs.filter((p) => connected.has(p.number)), [prs, connected])

  const positions = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>()
    const connectedLayers = layers.map((l) => l.filter((n) => connected.has(n))).filter((l) => l.length > 0)
    connectedLayers.forEach((layer, li) => {
      layer.forEach((num, ni) => {
        map.set(num, { x: PAD + li * (NW + CG), y: PAD + ni * (NH + RG) })
      })
    })
    return map
  }, [layers, connected])

  const svgW = Math.max(layers.filter((l) => l.some((n) => connected.has(n))).length, 1) * (NW + CG) - CG + PAD * 2
  const maxLayerSize = Math.max(...layers.map((l) => l.filter((n) => connected.has(n)).length), 1)
  const svgH = Math.max(maxLayerSize * (NH + RG) - RG + PAD * 2, NH + PAD * 2)

  const edges = useMemo(() => {
    const result: { from: number; to: number; kind: 'hard' | 'soft' }[] = []
    for (const [num, { hard, soft }] of deps) {
      if (!connected.has(num)) continue
      for (const dep of hard) if (connected.has(dep)) result.push({ from: num, to: dep, kind: 'hard' })
      for (const dep of soft) if (connected.has(dep)) result.push({ from: num, to: dep, kind: 'soft' })
    }
    return result
  }, [deps, connected])

  const hardCount = edges.filter((e) => e.kind === 'hard').length
  const softCount = edges.filter((e) => e.kind === 'soft').length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground/70">
        {hardCount > 0 && (
          <span className="flex items-center gap-1.5">
            <svg width="24" height="8">
              <defs><marker id="ah-pre" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="#64748b" /></marker></defs>
              <line x1="0" y1="4" x2="20" y2="4" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ah-pre)" />
            </svg>
            depends on ({hardCount})
          </span>
        )}
        {softCount > 0 && (
          <span className="flex items-center gap-1.5">
            <svg width="24" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
            mentions ({softCount})
          </span>
        )}
        {independent.length > 0 && <span className="ml-auto">{independent.length} independent</span>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        {graphPRs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <div>
              <p className="text-sm font-medium">No dependencies detected</p>
              <p className="mt-1 text-xs text-muted-foreground">No PR bodies reference another open PR with #N.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-auto rounded-xl border border-border bg-card">
            <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', minWidth: svgW }}>
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0,8 3,0 6" fill="#64748b" />
                </marker>
                <marker id="arrowhead-hard" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0,8 3,0 6" fill="#475569" />
                </marker>
              </defs>
              {edges.map(({ from, to, kind }) => {
                const fp = positions.get(from)
                const tp = positions.get(to)
                if (!fp || !tp) return null
                const isRight = fp.x < tp.x
                const x1 = isRight ? fp.x + NW : fp.x
                const y1 = fp.y + NH / 2
                const x2 = isRight ? tp.x : tp.x + NW
                const y2 = tp.y + NH / 2
                const cx = (x1 + x2) / 2
                return (
                  <path
                    key={`${from}-${to}`}
                    d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={kind === 'hard' ? '#475569' : '#94a3b8'}
                    strokeWidth={kind === 'hard' ? 1.8 : 1.2}
                    strokeDasharray={kind === 'soft' ? '4 3' : undefined}
                    markerEnd={kind === 'hard' ? 'url(#arrowhead-hard)' : 'url(#arrowhead)'}
                  />
                )
              })}
              {graphPRs.map((pr) => {
                const pos = positions.get(pr.number)
                if (!pos) return null
                const score = localRiskScore(pr)
                const { fill, stroke } = nodeStyle(score)
                const isActive = indexByNumber.get(pr.number) === currentIndex
                const title = pr.title.length > 22 ? pr.title.slice(0, 21) + '…' : pr.title
                const author = pr.author.handle.length > 18 ? pr.author.handle.slice(0, 17) + '…' : pr.author.handle
                return (
                  <g key={pr.number} onClick={() => { const i = indexByNumber.get(pr.number); if (i !== undefined) onSelect(i) }} style={{ cursor: 'pointer' }}>
                    <rect x={pos.x} y={pos.y} width={NW} height={NH} rx={8} fill={fill} stroke={isActive ? '#22C55E' : stroke} strokeWidth={isActive ? 2.5 : 1.5} />
                    <text x={pos.x + 8} y={pos.y + 17} fontSize={10} fontFamily="monospace" fill="#374151" fontWeight="700">
                      #{pr.number}
                      <tspan fill="#6b7280" fontWeight="400" fontSize={9}> · {score}</tspan>
                    </text>
                    <text x={pos.x + 8} y={pos.y + 31} fontSize={9} fontFamily="sans-serif" fill="#374151">{title}</text>
                    <text x={pos.x + 8} y={pos.y + 46} fontSize={8} fontFamily="monospace" fill="#94a3b8">@{author}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        )}

        {independent.length > 0 && (
          <div>
            <p className="mb-2 font-mono text-[11px] text-muted-foreground/60">
              Independent ({independent.length}) — no cross-references
            </p>
            <div className="flex flex-wrap gap-2">
              {independent.map((pr) => {
                const score = localRiskScore(pr)
                const i = indexByNumber.get(pr.number)
                return (
                  <button
                    key={pr.number}
                    onClick={() => { if (i !== undefined) onSelect(i) }}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-all hover:shadow-sm ${
                      i === currentIndex ? 'border-[#22C55E] bg-[#22C55E]/5 ring-1 ring-[#22C55E]/30' : 'border-border bg-card hover:border-muted'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">#{pr.number}</span>
                    <span className="max-w-[140px] truncate font-medium">{pr.title}</span>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${riskColor(score)}`}>{score}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
