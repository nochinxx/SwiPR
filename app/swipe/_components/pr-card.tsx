'use client'

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import type { PullRequest, SwipeAction, ImpactResult } from '../_types'
import { ExternalLink } from 'lucide-react'
import { ImpactMap } from './impact-map'

interface PRCardProps {
  readonly pr: PullRequest
  readonly isActive: boolean
  readonly stackIndex: number
  readonly onSwipe: (action: SwipeAction) => void
  readonly impact?: ImpactResult | null
  readonly isLoadingImpact?: boolean
}

function stateColorClass(state: PullRequest['state']): string {
  if (state === 'open') return 'bg-[#22C55E]'
  if (state === 'merged') return 'bg-purple-500'
  return 'bg-red-500'
}

function ciColorClass(status: PullRequest['ciStatus']): string {
  if (status === 'passing') return 'bg-[#22C55E]'
  if (status === 'failing') return 'bg-[#DC2626]'
  return 'bg-amber-500'
}

function cardOpacity(isActive: boolean, stackIndex: number): number {
  if (isActive) return 1
  return stackIndex === 1 ? 0.6 : 0.3
}

export function PRCard({ pr, isActive, stackIndex, onSwipe, impact, isLoadingImpact }: PRCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12])
  const greenOverlayOpacity = useTransform(x, [0, 100, 200], [0, 0.1, 0.3])
  const redOverlayOpacity = useTransform(x, [-200, -100, 0], [0.3, 0.1, 0])

  const scale = isActive ? 1 : 1 - stackIndex * 0.04
  const translateY = isActive ? 0 : -stackIndex * 8

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 100
    const velocityThreshold = 500

    if (Math.abs(info.velocity.x) > velocityThreshold || Math.abs(info.offset.x) > threshold) {
      onSwipe(info.offset.x > 0 ? 'approve' : 'changes')
    } else if (info.offset.y > threshold || info.velocity.y > velocityThreshold) {
      onSwipe('skip')
    }
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ scale, y: translateY, opacity: cardOpacity(isActive, stackIndex), zIndex: 10 - stackIndex }}
      initial={false}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-card"
        style={{ x, y, rotate }}
        drag={isActive}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragEnd={handleDragEnd}
        whileDrag={{ boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2)' }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-l from-[#22C55E] to-transparent"
          style={{ opacity: greenOverlayOpacity }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-[#DC2626] to-transparent"
          style={{ opacity: redOverlayOpacity }}
        />

        <div className="flex h-full flex-col p-6">
          {/* Top row */}
          <div className="flex items-center gap-3 font-mono text-sm">
            <span className="text-foreground">#{pr.number}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase text-white ${stateColorClass(pr.state)}`}>
              {pr.state}
            </span>
            <span className="text-muted-foreground">{pr.openedAt}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium text-white ${ciColorClass(pr.ciStatus)}`}>
              CI {pr.ciStatus}
            </span>
          </div>

          {/* Author */}
          <div className="mt-4 flex items-center gap-2">
            {pr.author.avatarUrl ? (
              <img src={pr.author.avatarUrl} alt={pr.author.handle} className="h-6 w-6 rounded-full" crossOrigin="anonymous" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary font-mono text-xs text-muted-foreground">
                {pr.author.handle[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <span className="font-mono text-sm text-muted-foreground">@{pr.author.handle}</span>
          </div>

          {/* Title */}
          <h2 className="mt-3 line-clamp-2 text-[22px] font-medium leading-[1.3] text-card-foreground">
            {pr.title}
          </h2>

          {/* Body */}
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {pr.body}
          </p>

          {/* Impact map — active card shows live data, inactive cards show extended body */}
          <div className="mt-4 flex-1 overflow-hidden">
            {isActive ? (
              <div className="rounded-lg bg-secondary p-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Impact</p>
                <ImpactMap impact={impact ?? null} isLoading={isLoadingImpact ?? false} />
              </div>
            ) : (
              <p className="line-clamp-6 text-sm leading-relaxed text-muted-foreground/60">
                {pr.body}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
            <span>{pr.filesChanged} files changed</span>
            <span className="text-[#22C55E]">+{pr.additions}</span>
            <span className="text-[#DC2626]">-{pr.deletions}</span>
            <div className="h-3 w-px bg-border" />
            <a
              href={pr.htmlUrl ?? `https://github.com/pull/${pr.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              View on GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
