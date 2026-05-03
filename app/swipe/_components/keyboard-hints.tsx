'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface KeyboardHintsProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'J', description: 'Approve', color: 'text-[#22C55E]', swipeHint: 'Swipe right' },
  { key: 'F', description: 'Request changes', color: 'text-[#DC2626]', swipeHint: 'Swipe left' },
  { key: 'Space', description: 'Skip', color: 'text-[#D97706]', swipeHint: 'Swipe down' },
  { key: '?', description: 'Toggle this overlay', color: 'text-muted-foreground', swipeHint: null },
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

          {/* Panel - slides up from bottom on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-background p-5 pb-8 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6 sm:pb-6"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>

            {/* Drag handle for mobile */}
            <div className="mb-4 flex justify-center sm:hidden">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="hidden sm:inline">Keyboard Shortcuts</span>
              <span className="sm:hidden">Controls</span>
            </div>
            <h2 className="mt-1 font-mono text-xl font-bold text-foreground">Review faster.</h2>

            {/* Shortcut rows */}
            <div className="mt-5 sm:mt-6">
              {SHORTCUTS.map(({ key, description, color, swipeHint }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0 sm:justify-start sm:py-2"
                >
                  <div className="flex items-center gap-3">
                    <kbd className="hidden min-w-[36px] items-center justify-center rounded-md border border-border bg-secondary px-2 py-1 font-mono text-sm font-semibold text-foreground sm:inline-flex">
                      {key}
                    </kbd>
                    <span className={`font-mono text-sm ${color}`}>{description}</span>
                  </div>
                  {swipeHint && (
                    <span className="font-mono text-xs text-muted-foreground sm:hidden">{swipeHint}</span>
                  )}
                  <kbd className="hidden min-w-[36px] items-center justify-center rounded-md border border-border bg-secondary px-2 py-1 font-mono text-sm font-semibold text-foreground sm:hidden">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>

            {/* Footer */}
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              <span className="hidden sm:inline">Pro tip: clear 50 PRs without touching the mouse.</span>
              <span className="sm:hidden">Swipe cards or use buttons below to review.</span>
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
