'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface SessionSummaryProps {
  stats: {
    approved: number
    changesRequested: number
    skipped: number
    totalReviewed: number
  }
  streak: number
  repoName: string
  onLoadRepo: (repo: string) => void
}

const STAT_BLOCKS = [
  { key: 'approved', label: 'Approved', color: 'text-[#22C55E]' },
  { key: 'changesRequested', label: 'Changes', color: 'text-[#DC2626]' },
  { key: 'skipped', label: 'Skipped', color: 'text-[#D97706]' },
] as const

export function SessionSummary({ stats, streak, repoName, onLoadRepo }: SessionSummaryProps) {
  const [repoInput, setRepoInput] = useState('')

  const approvalRate = stats.totalReviewed > 0 
    ? Math.round((stats.approved / stats.totalReviewed) * 100) 
    : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (repoInput.trim()) {
      onLoadRepo(repoInput.trim())
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
      className="flex flex-col items-center"
    >
      {/* Headline stat */}
      <div className="text-center">
        <div className="font-mono text-sm uppercase tracking-widest text-[#22C55E]">
          Done
        </div>
        <div className="mt-2 font-mono text-5xl font-bold tabular-nums text-foreground">
          {stats.totalReviewed}
        </div>
        <div className="mt-1 font-mono text-lg text-muted-foreground">
          PRs reviewed
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-8 flex w-full gap-4">
        {STAT_BLOCKS.map(({ key, label, color }, index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.15 + 0.05 * index }}
            className="flex-1 rounded-xl border border-border bg-card p-4 text-center"
          >
            <div className={`font-mono text-3xl font-bold tabular-nums ${color}`}>
              {stats[key]}
            </div>
            <div className="mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Approval rate bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.3 }}
        className="mt-6 w-full"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Approval Rate
          </span>
          <span className="font-mono text-lg font-bold tabular-nums text-foreground">
            {approvalRate}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${approvalRate}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.5 }}
            className="h-full rounded-full bg-[#22C55E]"
          />
        </div>
      </motion.div>

      {/* Badge row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.35 }}
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        {streak >= 5 && (
          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 font-mono text-xs text-orange-500">
            {streak} review streak
          </span>
        )}
        <span className="rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-1 font-mono text-xs text-[#22C55E]">
          All open PRs reviewed
        </span>
      </motion.div>

      {/* CTA - load another repo */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.4 }}
        className="mt-8 w-full"
      >
        <div className="text-center font-mono text-xs text-muted-foreground">
          Load another repo:
        </div>
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="owner/repo"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-full bg-foreground px-4 py-2 font-mono text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Load PRs
          </button>
        </form>
      </motion.div>

      {/* Footer note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center font-mono text-xs text-muted-foreground"
      >
        J &middot; approve &nbsp;&nbsp; F &middot; changes &nbsp;&nbsp; Space &middot; skip
      </motion.div>
    </motion.div>
  )
}
