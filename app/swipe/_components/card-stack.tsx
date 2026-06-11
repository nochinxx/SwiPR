'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { PullRequest, SwipeAction, ImpactResult } from '../_types'
import { PRCard } from './pr-card'

interface CardStackProps {
  readonly prs: PullRequest[]
  readonly currentIndex: number
  readonly onSwipe: (action: SwipeAction) => void
  readonly impact?: ImpactResult | null
  readonly isLoadingImpact?: boolean
}

export function CardStack({ prs, currentIndex, onSwipe, impact, isLoadingImpact }: CardStackProps) {
  const visiblePRs = prs.slice(currentIndex, currentIndex + 3)

  return (
    <div className="relative h-[520px] w-full lg:h-[600px]">
      <AnimatePresence mode="popLayout">
        {visiblePRs.map((pr, index) => (
          <motion.div
            key={pr.number}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.9,
              transition: { duration: 0.3, type: 'spring', stiffness: 300, damping: 30 },
            }}
            className="absolute inset-0"
          >
            <PRCard
              pr={pr}
              isActive={index === 0}
              stackIndex={index}
              onSwipe={onSwipe}
              impact={index === 0 ? impact : null}
              isLoadingImpact={index === 0 ? (isLoadingImpact ?? false) : false}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ActionButtonsProps {
  onAction: (action: SwipeAction) => void
}

export function ActionButtons({ onAction }: ActionButtonsProps) {
  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      <button
        onClick={() => onAction('changes')}
        className="group flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#DC2626] bg-card font-mono text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#DC2626]/10"
      >
        <span>x</span>
        <span>Request changes</span>
        <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          F
        </span>
      </button>
      <button
        onClick={() => onAction('skip')}
        className="group flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-border bg-card font-mono text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
      >
        <span>↓</span>
        <span>Skip</span>
        <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          space
        </span>
      </button>
      <button
        onClick={() => onAction('approve')}
        className="group flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#22C55E] bg-card font-mono text-sm font-medium text-[#22C55E] transition-colors hover:bg-[#22C55E]/10"
      >
        <span>✓</span>
        <span>Approve</span>
        <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          J
        </span>
      </button>
    </div>
  )
}
