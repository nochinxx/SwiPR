'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { SwipeAction, ChatMessage, SessionStats } from './_types'
import {
  MOCK_PRS,
  MOCK_AI_CONTEXT,
  MOCK_CHAT_MESSAGES,
  MOCK_SESSION_STATS,
  MOCK_STREAK,
  MOCK_TOTAL_PRS,
  MOCK_CURRENT_PR_INDEX,
  MOCK_REPO,
} from './_data'
import { Header } from './_components/header'
import { CardStack, ActionButtons } from './_components/card-stack'
import { AIContextPanel } from './_components/ai-context-panel'
import { BottomStrip } from './_components/bottom-strip'
import { MobileContextSheet } from './_components/mobile-context-sheet'
import { KeyboardHints } from './_components/keyboard-hints'

export default function SwipePage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [streak, setStreak] = useState(MOCK_STREAK)
  const [stats, setStats] = useState<SessionStats>(MOCK_SESSION_STATS)
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES)
  const [lastAction, setLastAction] = useState<SwipeAction | null>(null)
  const [hintsOpen, setHintsOpen] = useState(false)

  const handleSwipe = useCallback((action: SwipeAction) => {
    console.log('[v0] Action:', action)
    setLastAction(action)

    // Update stats
    setStats((prev) => ({
      ...prev,
      approved: action === 'approve' ? prev.approved + 1 : prev.approved,
      changesRequested: action === 'changes' ? prev.changesRequested + 1 : prev.changesRequested,
      skipped: action === 'skip' ? prev.skipped + 1 : prev.skipped,
    }))

    // Update streak
    if (action !== 'skip') {
      setStreak((prev) => prev + 1)
    } else {
      setStreak(0)
    }

    // Move to next card
    setCurrentIndex((prev) => Math.min(prev + 1, MOCK_PRS.length - 1))
  }, [])

  const handleSendMessage = useCallback((content: string) => {
    console.log('[v0] Sending message:', content)
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
    }
    setMessages((prev) => [...prev, newMessage])

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'll analyze that for you. Based on the PR changes, here's what I found...`,
        toolCall: 'analyze_code',
      }
      setMessages((prev) => [...prev, assistantMessage])
    }, 500)
  }, [])

  const handleDeeperAction = useCallback(async (action: 'risk_verbose' | 'callers' | 'tests' | 'compare'): Promise<string> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1200))

    const responses: Record<typeof action, string> = {
      risk_verbose: `This PR modifies core authentication logic in src/auth/session.ts.

Key concerns:
• Changes to token validation could affect all authenticated routes
• No migration path provided for existing sessions
• Rate limiting logic removed without replacement

The contributor has 3 prior PRs merged, but none touched auth code.`,
      callers: `Functions affected by this change:

src/api/middleware/auth.ts
  └─ validateSession() - called 47 times
  └─ refreshToken() - called 12 times

src/api/routes/user.ts
  └─ getCurrentUser() - called 8 times

src/api/routes/billing.ts
  └─ checkSubscription() - called 23 times`,
      tests: `Test coverage for affected files:

src/auth/session.ts
  ├─ session.test.ts (14 tests, 2 failing)
  └─ integration/auth.test.ts (8 tests, passing)

Missing coverage:
  • No tests for edge case: expired refresh token
  • No tests for concurrent session handling`,
      compare: `Diff summary vs main:

+142 lines added
-87 lines removed
3 files changed

Key differences:
• session.ts: Token struct changed from { token, expires } to { jwt, metadata }
• middleware/auth.ts: Now uses async validation
• types/auth.d.ts: New SessionMetadata interface added`,
    }

    return responses[action]
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input (except for ? which should work everywhere)
      const isInputFocused = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement

      if (e.key === '?') {
        e.preventDefault()
        setHintsOpen((prev) => !prev)
        return
      }

      if (isInputFocused) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'j':
          handleSwipe('approve')
          break
        case 'f':
          handleSwipe('changes')
          break
        case ' ':
          e.preventDefault()
          handleSwipe('skip')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSwipe])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        currentPR={MOCK_CURRENT_PR_INDEX + currentIndex}
        totalPRs={MOCK_TOTAL_PRS}
        streak={streak}
        defaultRepo={MOCK_REPO}
        onToggleHints={() => setHintsOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-4 py-6 pb-24 lg:flex-row lg:px-8 lg:pb-20">
        {/* Left column - Card stack */}
        <div className="w-full lg:w-[60%]">
          <CardStack prs={MOCK_PRS} currentIndex={currentIndex} onSwipe={handleSwipe} />

          {/* Action buttons - visible on all screens */}
          <ActionButtons onAction={handleSwipe} />

          {/* Streak animation */}
          {lastAction && lastAction !== 'skip' && (
            <motion.div
              key={streak}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4 text-center font-mono text-sm text-muted-foreground"
            >
              {streak >= 2 && `${streak} in a row!`}
            </motion.div>
          )}
        </div>

        {/* Right column - AI Context Panel (desktop only) */}
        <aside className="sticky top-20 hidden h-[calc(100vh-120px)] w-[40%] overflow-hidden lg:block">
          <div className="h-full rounded-xl border border-border bg-secondary/50 p-4">
            <AIContextPanel context={MOCK_AI_CONTEXT} messages={messages} onSendMessage={handleSendMessage} onDeeperAction={handleDeeperAction} />
          </div>
        </aside>
      </main>

      {/* Mobile context sheet */}
      <MobileContextSheet context={MOCK_AI_CONTEXT} messages={messages} onSendMessage={handleSendMessage} onDeeperAction={handleDeeperAction} />

      <BottomStrip stats={stats} />

      <KeyboardHints open={hintsOpen} onClose={() => setHintsOpen(false)} />
    </div>
  )
}
