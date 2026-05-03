'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useChat } from '@ai-sdk/react'
import type { PullRequest, SwipeAction, ChatMessage, SessionStats, AIContext } from './_types'
import { Header } from './_components/header'
import { CardStack, ActionButtons } from './_components/card-stack'
import { AIContextPanel } from './_components/ai-context-panel'
import { BottomStrip } from './_components/bottom-strip'
import { MobileContextSheet } from './_components/mobile-context-sheet'
import { KeyboardHints } from './_components/keyboard-hints'
import { SessionSummary } from './_components/session-summary'

type DeeperAction = 'risk_verbose' | 'callers' | 'tests' | 'compare'

// Ingesting/Loading state component
function IngestingState({ isIngesting, isLoadingPRs, repo }: { isIngesting: boolean; isLoadingPRs: boolean; repo: string }) {
  const [dotIndex, setDotIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  // Cycling dots animation
  useEffect(() => {
    if (!isIngesting) return
    const interval = setInterval(() => {
      setDotIndex((prev) => (prev + 1) % 4)
    }, 600)
    return () => clearInterval(interval)
  }, [isIngesting])

  // Fake progress bar animation (0 -> 70% over ~20s)
  useEffect(() => {
    if (!isIngesting) {
      setProgress(0)
      return
    }
    const startTime = Date.now()
    const duration = 20000 // 20 seconds to reach 70%
    const targetProgress = 70

    const animate = () => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * targetProgress, targetProgress)
      setProgress(newProgress)
      if (elapsed < duration && isIngesting) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [isIngesting])

  const dots = ['', '.', '..', '...'][dotIndex]

  // Loading from DB (fast state)
  if (!isIngesting && isLoadingPRs) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="font-mono text-sm text-muted-foreground animate-pulse"
        >
          Loading…
        </motion.div>
      </div>
    )
  }

  // Ingesting from GitHub
  return (
    <div className="flex h-64 flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex flex-col items-center gap-3"
      >
        {/* Repo name */}
        <div className="font-mono text-lg font-medium text-foreground">{repo}</div>

        {/* Animated dots */}
        <div className="h-4 font-mono text-sm text-muted-foreground">
          <span className="inline-block w-6">{dots}</span>
        </div>

        {/* Status line */}
        <div className="font-mono text-sm text-muted-foreground">Fetching PRs from GitHub…</div>

        {/* Progress bar */}
        <div className="mt-2 h-0.5 w-48 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-[#22C55E]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          />
        </div>
      </motion.div>
    </div>
  )
}

const SKELETON_CONTEXT: AIContext = {
  risk: { score: 0, rationale: 'Loading…' },
  summary: ['Loading context…'],
  similarPRs: [],
  contributor: { handle: '…', avatarUrl: '', priorPRs: 0, mergeRate: 0, firstPR: '…' },
}

export default function SwipePage() {
  // Repo state
  const [repoInput, setRepoInput] = useState('resend/resend-node')
  const [repoId, setRepoId] = useState<string | null>(null)
  const [isIngesting, setIsIngesting] = useState(false)

  // PR state
  const [prList, setPrList] = useState<PullRequest[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoadingPRs, setIsLoadingPRs] = useState(false)

  // Context state
  const [context, setContext] = useState<AIContext | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(false)

  // Session
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Streak + stats
  const [streak, setStreak] = useState(0)
  const [stats, setStats] = useState<SessionStats>({ approved: 0, changesRequested: 0, skipped: 0 })
  const [lastAction, setLastAction] = useState<SwipeAction | null>(null)
  const [hintsOpen, setHintsOpen] = useState(false)

  // useChat for AI panel
  const { messages: chatMessages, append, isLoading: isChatLoading } = useChat({
    api: '/api/chat',
    body: {
      prId: prList[currentIndex]?.id,
      repoId,
      sessionId,
    },
  })

  // Map useChat messages to ChatMessage[]
  const messages: ChatMessage[] = chatMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    toolCall: m.toolInvocations?.[0]?.toolName,
  }))

  // Load repo function
  const loadRepo = useCallback(async (repoStr: string) => {
    const [owner, repo] = repoStr.split('/')
    if (!owner || !repo) return

    setRepoInput(repoStr)
    setIsIngesting(true)
    setIsLoadingPRs(true)
    setPrList([])
    setCurrentIndex(0)
    setContext(null)
    setStreak(0)
    setStats({ approved: 0, changesRequested: 0, skipped: 0 })
    setLastAction(null)

    try {
      // 1. Ingest (fetch from GitHub + embed + store in DB)
      await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, name: repo }),
      })
      setIsIngesting(false)

      // 2. Load PRs from DB
      const res = await fetch(`/api/prs?owner=${owner}&repo=${repo}`)
      const data = await res.json()
      setPrList(data.prs ?? [])
      setRepoId(data.repoId ?? null)

      // 3. Create session
      if (data.repoId) {
        const sessionRes = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoId: data.repoId }),
        })
        const session = await sessionRes.json()
        setSessionId(session.id)
      }
    } catch (error) {
      console.error('[v0] Failed to load repo:', error)
    } finally {
      setIsIngesting(false)
      setIsLoadingPRs(false)
    }
  }, [])

  // Load context for active PR
  const loadContext = useCallback(async (pr: PullRequest) => {
    if (!pr.id) return
    setIsLoadingContext(true)
    setContext(null)
    try {
      const res = await fetch(`/api/context?prId=${pr.id}`)
      const ctx = await res.json()
      setContext(ctx)
    } catch (error) {
      console.error('[v0] Failed to load context:', error)
    } finally {
      setIsLoadingContext(false)
    }
  }, [])

  // Load repo on mount
  useEffect(() => {
    loadRepo('resend/resend-node')
  }, [loadRepo])

  // Load context when PR changes
  useEffect(() => {
    if (prList[currentIndex]) {
      loadContext(prList[currentIndex])
    }
  }, [currentIndex, prList, loadContext])

  // Handle swipe action
  const handleSwipe = useCallback(
    async (action: SwipeAction) => {
      const pr = prList[currentIndex]
      setLastAction(action)

      // Update stats
      setStats((prev) => ({
        ...prev,
        approved: action === 'approve' ? prev.approved + 1 : prev.approved,
        changesRequested: action === 'changes' ? prev.changesRequested + 1 : prev.changesRequested,
        skipped: action === 'skip' ? prev.skipped + 1 : prev.skipped,
      }))

      // Update streak
      setStreak((prev) => (action !== 'skip' ? prev + 1 : 0))

      // Move to next card
      setCurrentIndex((prev) => prev + 1)

      // Record decision in DB (fire and forget)
      if (pr?.id && sessionId) {
        fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'tools/call',
            params: { name: 'record_decision', arguments: { session_id: sessionId, pr_id: pr.id, action } },
          }),
        }).catch(console.error)
      }
    },
    [prList, currentIndex, sessionId]
  )

  // Handle chat message
  const handleSendMessage = useCallback(
    (content: string) => {
      append({ role: 'user', content })
    },
    [append]
  )

  // Handle deeper action
  const handleDeeperAction = useCallback(
    async (action: DeeperAction): Promise<string> => {
      const pr = prList[currentIndex]
      if (!pr?.id || !repoId) return 'No active PR'

      const toolCall = {
        risk_verbose: () =>
          fetch('/api/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'tools/call',
              params: { name: 'risk_score', arguments: { pr_id: pr.id, verbose: true } },
            }),
          }),
        callers: () =>
          fetch('/api/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'tools/call',
              params: {
                name: 'find_callers',
                arguments: { repo_id: repoId, function_name: pr.title.match(/`(\w+)`/)?.[1] ?? 'main' },
              },
            }),
          }),
        tests: () =>
          fetch('/api/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'tools/call',
              params: { name: 'find_related_tests', arguments: { pr_id: pr.id } },
            }),
          }),
        compare: () =>
          fetch('/api/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'tools/call',
              params: { name: 'compare_with', arguments: { repo_id: repoId, pr_id: pr.id, ref: 'main' } },
            }),
          }),
      }[action]

      try {
        const res = await toolCall()
        const data = await res.json()
        const text = data?.content?.[0]?.text
        if (!text) return 'No result'
        const parsed = JSON.parse(text)
        return JSON.stringify(parsed, null, 2)
      } catch (error) {
        console.error('[v0] Deeper action failed:', error)
        return 'Failed to fetch result'
      }
    },
    [prList, currentIndex, repoId]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement

      if (e.key === '?') {
        e.preventDefault()
        setHintsOpen((prev) => !prev)
        return
      }

      if (isInputFocused) return

      switch (e.key.toLowerCase()) {
        case 'j':
          if (currentIndex < prList.length) handleSwipe('approve')
          break
        case 'f':
          if (currentIndex < prList.length) handleSwipe('changes')
          break
        case ' ':
          e.preventDefault()
          if (currentIndex < prList.length) handleSwipe('skip')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSwipe, currentIndex, prList.length])

  const isLoading = isIngesting || isLoadingPRs
  const displayContext = isLoadingContext ? SKELETON_CONTEXT : (context ?? SKELETON_CONTEXT)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        currentPR={currentIndex + 1}
        totalPRs={prList.length}
        streak={streak}
        defaultRepo={repoInput}
        onToggleHints={() => setHintsOpen(true)}
        onRepoSubmit={loadRepo}
        isLoading={isLoading}
      />

      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-4 py-6 pb-24 lg:flex-row lg:px-8 lg:pb-20">
        {/* Left column - Card stack or Session Summary */}
        <div className="w-full lg:w-[60%]">
          {isIngesting || isLoadingPRs ? (
            <IngestingState isIngesting={isIngesting} isLoadingPRs={isLoadingPRs} repo={repoInput} />
          ) : prList.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <div className="font-mono text-sm text-muted-foreground">No open PRs found.</div>
            </div>
          ) : currentIndex >= prList.length ? (
            <SessionSummary
              stats={{
                approved: stats.approved,
                changesRequested: stats.changesRequested,
                skipped: stats.skipped,
                totalReviewed: stats.approved + stats.changesRequested + stats.skipped,
              }}
              streak={streak}
              repoName={repoInput}
              onLoadRepo={loadRepo}
            />
          ) : (
            <>
              <CardStack prs={prList} currentIndex={currentIndex} onSwipe={handleSwipe} />

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
            </>
          )}
        </div>

        {/* Right column - AI Context Panel (desktop only) */}
        <aside className="sticky top-20 hidden h-[calc(100vh-120px)] w-[40%] overflow-hidden lg:block">
          <div className="h-full rounded-xl border border-border bg-secondary/50 p-4">
            <AIContextPanel
              context={displayContext}
              messages={messages}
              onSendMessage={handleSendMessage}
              onDeeperAction={handleDeeperAction}
            />
          </div>
        </aside>
      </main>

      {/* Mobile context sheet */}
      <MobileContextSheet
        context={displayContext}
        messages={messages}
        onSendMessage={handleSendMessage}
        onDeeperAction={handleDeeperAction}
      />

      <BottomStrip stats={stats} />

      <KeyboardHints open={hintsOpen} onClose={() => setHintsOpen(false)} />
    </div>
  )
}
