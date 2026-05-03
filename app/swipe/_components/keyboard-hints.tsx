'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface KeyboardHintsProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'J', description: 'Approve', color: 'text-[#16A34A]' },
  { key: 'F', description: 'Request changes', color: 'text-[#DC2626]' },
  { key: 'Space', description: 'Skip', color: 'text-[#D97706]' },
  { key: '?', description: 'Toggle this overlay', color: 'text-muted-foreground' },
]

export function KeyboardHints({ open, onClose }: KeyboardHintsProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Keyboard Shortcuts
            </div>
            <h2 className="mt-1 font-mono text-xl font-bold text-foreground">Review faster.</h2>

            {/* Shortcut rows */}
            <div className="mt-6">
              {SHORTCUTS.map(({ key, description, color }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 border-b border-border py-2 last:border-0"
                >
                  <kbd className="inline-flex min-w-[32px] items-center justify-center rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
                    {key}
                  </kbd>
                  <span className={`font-mono text-sm ${color}`}>{description}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              Pro tip: clear 50 PRs without touching the mouse.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
