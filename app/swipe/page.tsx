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

export default function SwipePage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [streak, setStreak] = useState(MOCK_STREAK)
  const [stats, setStats] = useState<SessionStats>(MOCK_SESSION_STATS)
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES)
  const [lastAction, setLastAction] = useState<SwipeAction | null>(null)

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
    <div className="flex min-h-screen flex-col bg-white">
      <Header
        currentPR={MOCK_CURRENT_PR_INDEX + currentIndex}
        totalPRs={MOCK_TOTAL_PRS}
        streak={streak}
        defaultRepo={MOCK_REPO}
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
              className="mt-4 text-center font-mono text-sm text-slate-500"
            >
              {streak >= 2 && `🔥 ${streak} in a row!`}
            </motion.div>
          )}
        </div>

        {/* Right column - AI Context Panel (desktop only) */}
        <aside className="sticky top-20 hidden h-[calc(100vh-120px)] w-[40%] overflow-hidden lg:block">
          <div className="h-full rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <AIContextPanel context={MOCK_AI_CONTEXT} messages={messages} onSendMessage={handleSendMessage} />
          </div>
        </aside>
      </main>

      {/* Mobile context sheet */}
      <MobileContextSheet context={MOCK_AI_CONTEXT} messages={messages} onSendMessage={handleSendMessage} />

      <BottomStrip stats={stats} />
    </div>
  )
}
