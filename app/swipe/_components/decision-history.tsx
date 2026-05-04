'use client'

import { motion, useDragControls } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'
import type { DecisionRecord, SwipeAction } from '../_types'

interface DecisionHistoryProps {
  decisions: DecisionRecord[]
  action: SwipeAction
  onClose: () => void
}

const ACTION_CONFIG = {
  approve: {
    label: 'APPROVED',
    color: 'text-[#22C55E]',
    bgColor: 'bg-[#22C55E]',
    borderColor: 'bg-[#22C55E]/30',
  },
  changes: {
    label: 'CHANGES REQUESTED',
    color: 'text-[#DC2626]',
    bgColor: 'bg-[#DC2626]',
    borderColor: 'bg-[#DC2626]/30',
  },
  skip: {
    label: 'SKIPPED',
    color: 'text-[#D97706]',
    bgColor: 'bg-[#D97706]',
    borderColor: 'bg-[#D97706]/30',
  },
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function DecisionHistory({ decisions, action, onClose }: DecisionHistoryProps) {
  const dragControls = useDragControls()
  const config = ACTION_CONFIG[action]

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) {
            onClose()
          }
        }}
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[60vh] flex-col rounded-t-2xl border-t border-border bg-background"
      >
        {/* Drag indicator */}
        <div
          className="flex cursor-grab justify-center py-3 active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${config.bgColor}`} />
            <div>
              <div className={`font-mono text-sm font-semibold uppercase tracking-wider ${config.color}`}>
                {config.label}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {decisions.length} PR{decisions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {decisions.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <span className="font-mono text-sm text-muted-foreground">
                No PRs {action === 'approve' ? 'approved' : action === 'changes' ? 'flagged' : 'skipped'} yet.
              </span>
            </div>
          ) : (
            decisions.map((decision) => (
              <div
                key={decision.pr.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-secondary/50"
              >
                {/* Left border indicator */}
                <div className={`h-8 w-1 self-stretch rounded-r ${config.borderColor}`} />
                
                {/* PR number */}
                <span className="min-w-[48px] font-mono text-xs text-muted-foreground">
                  #{decision.pr.number}
                </span>
                
                {/* Title */}
                <span className="flex-1 truncate text-sm text-foreground">
                  {decision.pr.title}
                </span>
                
                {/* Author - hidden on small screens */}
                <span className="hidden font-mono text-xs text-muted-foreground sm:block">
                  @{decision.pr.author.handle}
                </span>
                
                {/* Time */}
                <span className="font-mono text-xs text-muted-foreground">
                  {formatRelativeTime(decision.decidedAt)}
                </span>
                
                {/* GitHub link */}
                <a
                  href={`https://github.com/${decision.pr.repoId?.replace('-', '/')}/pull/${decision.pr.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </>
  )
}
