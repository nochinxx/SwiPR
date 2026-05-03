'use client'

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import type { PullRequest, SwipeAction } from '../_types'
import { ExternalLink } from 'lucide-react'

interface PRCardProps {
  pr: PullRequest
  isActive: boolean
  stackIndex: number
  onSwipe: (action: SwipeAction) => void
}

export function PRCard({ pr, isActive, stackIndex, onSwipe }: PRCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12])
  const greenOverlayOpacity = useTransform(x, [0, 100, 200], [0, 0.1, 0.3])
  const redOverlayOpacity = useTransform(x, [-200, -100, 0], [0.3, 0.1, 0])

  const scale = isActive ? 1 : 1 - stackIndex * 0.04
  const translateY = isActive ? 0 : -stackIndex * 8
  const opacity = isActive ? 1 : stackIndex === 1 ? 0.6 : 0.3

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 100
    const velocityThreshold = 500

    if (Math.abs(info.velocity.x) > velocityThreshold || Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        console.log('[v0] Swiped right - Approve')
        onSwipe('approve')
      } else {
        console.log('[v0] Swiped left - Request changes')
        onSwipe('changes')
      }
    } else if (info.offset.y > threshold || info.velocity.y > velocityThreshold) {
      console.log('[v0] Swiped down - Skip')
      onSwipe('skip')
    }
  }

  const stateColor = pr.state === 'open' ? 'bg-[#16A34A]' : pr.state === 'merged' ? 'bg-purple-500' : 'bg-red-500'
  const ciColor = pr.ciStatus === 'passing' ? 'bg-[#16A34A]' : pr.ciStatus === 'failing' ? 'bg-[#DC2626]' : 'bg-amber-500'

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        scale,
        y: translateY,
        opacity,
        zIndex: 10 - stackIndex,
      }}
      initial={false}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
        style={{ x, y, rotate }}
        drag={isActive}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragEnd={handleDragEnd}
        whileDrag={{ boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
      >
        {/* Green overlay for approve */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-l from-[#16A34A] to-transparent"
          style={{ opacity: greenOverlayOpacity }}
        />
        {/* Red overlay for changes */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-[#DC2626] to-transparent"
          style={{ opacity: redOverlayOpacity }}
        />

        <div className="flex h-full flex-col p-6">
          {/* Top row: PR number, state, date, CI */}
          <div className="flex items-center gap-3 font-mono text-sm">
            <span className="text-[#0A0A0A]">#{pr.number}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase text-white ${stateColor}`}>
              {pr.state}
            </span>
            <span className="text-slate-500">{pr.openedAt}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium text-white ${ciColor}`}>
              CI {pr.ciStatus}
            </span>
          </div>

          {/* Author row */}
          <div className="mt-4 flex items-center gap-2">
            <img
              src={pr.author.avatarUrl}
              alt={pr.author.handle}
              className="h-6 w-6 rounded-full"
              crossOrigin="anonymous"
            />
            <span className="font-mono text-sm text-slate-600">@{pr.author.handle}</span>
          </div>

          {/* Title */}
          <h2 className="mt-3 line-clamp-2 text-[22px] font-medium leading-[1.3] text-[#0A0A0A]">
            {pr.title}
          </h2>

          {/* Body excerpt */}
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
            {pr.body}
          </p>

          {/* Diff preview */}
          <div className="mt-4 flex-1 overflow-hidden">
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="mb-2 font-mono text-xs text-slate-500">{pr.diff.filePath}</div>
              <div className="space-y-0.5 font-mono text-xs">
                {pr.diff.lines.map((line, i) => (
                  <div
                    key={i}
                    className={`rounded px-2 py-0.5 ${
                      line.type === 'addition'
                        ? 'border-l-2 border-[#16A34A] bg-green-50 text-green-800'
                        : line.type === 'deletion'
                          ? 'border-l-2 border-[#DC2626] bg-red-50 text-red-800'
                          : 'text-slate-600'
                    }`}
                  >
                    <span className="mr-2 select-none text-slate-400">
                      {line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '}
                    </span>
                    {line.content || ' '}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4 font-mono text-xs text-slate-500">
            <span>{pr.filesChanged} files changed</span>
            <span className="text-[#16A34A]">+{pr.additions}</span>
            <span className="text-[#DC2626]">-{pr.deletions}</span>
            <div className="h-3 w-px bg-slate-200" />
            <a
              href={`https://github.com/resend/resend-node/pull/${pr.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-700"
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
