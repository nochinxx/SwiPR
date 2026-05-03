'use client'

import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { useState } from 'react'
import type { AIContext, ChatMessage } from '../_types'
import { AIContextPanel } from './ai-context-panel'

interface MobileContextSheetProps {
  context: AIContext
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
}

export function MobileContextSheet({ context, messages, onSendMessage }: MobileContextSheetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dragControls = useDragControls()

  return (
    <>
      {/* Handle at bottom */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-14 left-0 right-0 z-30 flex h-10 items-center justify-center border-t border-border bg-background lg:hidden"
      >
        <div className="flex items-center gap-2">
          <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
          <span className="font-mono text-xs text-muted-foreground">View context</span>
        </div>
      </button>

      {/* Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Sheet content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  setIsOpen(false)
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-50 h-[80vh] rounded-t-2xl border-t border-border bg-background p-4 lg:hidden"
            >
              {/* Drag indicator */}
              <div
                className="mb-4 flex cursor-grab justify-center active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
              </div>

              <AIContextPanel context={context} messages={messages} onSendMessage={onSendMessage} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
