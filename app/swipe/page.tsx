'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@ai-sdk/react'
import type { PullRequest, SwipeAction, ChatMessage, SessionStats, AIContext, DecisionRecord } from './_types'
import { Header } from './_components/header'
import { CardStack, ActionButtons } from './_components/card-stack'
import { AIContextPanel } from './_components/ai-context-panel'
import { BottomStrip } from './_components/bottom-strip'
import { MobileContextSheet } from './_components/mobile-context-sheet'
import { KeyboardHints } from './_components/keyboard-hints'
import { SessionSummary } from './_components/session-summary'
import { DecisionHistory } from './_components/decision-history'
import { ViewSwitcher, type ViewMode } from './_components/view-switcher'
import { ViewRiskMatrix } from './_components/view-risk-matrix'
import { ViewContributorFocus } from './_components/view-contributor-focus'
import { ViewCategoryGroup } from './_components/view-category-group'
import { ViewDependencyGraph } from './_components/view-dependency-graph'

type DeeperAction = 'risk_verbose' | 'callers' | 'tests' | 'compare'

function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const urlMatch = /github\.com\/([^/]+)\/([^/\s]+)/.exec(input)
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') }
  const parts = input.trim().split('/')
  if (parts.length === 2 && parts[0] && parts[1]) return { owner: parts[0], repo: parts[1] }
  return null
}

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
  const [repoInput, setRepoInput] = useState('')
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

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('swipe')

  // BYOK — read from localStorage on mount, null during SSR
  const [byokKey, setByokKey] = useState<string | null>(null)
  useEffect(() => {
    setByokKey(localStorage.getItem('swipr_byok_key'))
  }, [])

  // Streak + stats
  const [streak, setStreak] = useState(0)
  const [stats, setStats] = useState<SessionStats>({ approved: 0, changesRequested: 0, skipped: 0 })
  const [lastAction, setLastAction] = useState<SwipeAction | null>(null)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [decisionHistory, setDecisionHistory] = useState<DecisionRecord[]>([])
  const [historyFilter, setHistoryFilter] = useState<SwipeAction | null>(null)

  // useChat for AI panel
  const { messages: chatMessages, append, isLoading: isChatLoading } = useChat({
    api: '/api/chat',
    headers: byokKey ? { 'x-api-key': byokKey } : undefined,
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

  const startSession = useCallback(async (repoId: string) => {
    const sessionRes = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId }),
    })
    const session = await sessionRes.json()
    setSessionId(session.id)
  }, [])

  // Fast path: try DB first, no GitHub call
  const loadFromCache = useCallback(async (repoStr: string) => {
    const parsed = parseRepoInput(repoStr)
    if (!parsed) return false
    const { owner, repo } = parsed

    setRepoInput(repoStr)
    setIsLoadingPRs(true)
    setPrList([])
    setCurrentIndex(0)
    setContext(null)
    setStreak(0)
    setStats({ approved: 0, changesRequested: 0, skipped: 0 })
    setLastAction(null)

    try {
      const res = await fetch(`/api/prs?owner=${owner}&repo=${repo}`)
      if (!res.ok) return false
      const data = await res.json()
      if (!data.prs?.length) return false
      setPrList(data.prs)
      setRepoId(data.repoId ?? null)
      if (data.repoId) await startSession(data.repoId)
      return true
    } catch {
      return false
    } finally {
      setIsLoadingPRs(false)
    }
  }, [startSession])

  // Full load: ingest from GitHub then read from DB
  const loadRepo = useCallback(async (repoStr: string) => {
    const parsed = parseRepoInput(repoStr)
    if (!parsed) return
    const { owner, repo } = parsed

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
      await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, name: repo }),
      })
      setIsIngesting(false)

      const res = await fetch(`/api/prs?owner=${owner}&repo=${repo}`)
      const data = await res.json()
      setPrList(data.prs ?? [])
      setRepoId(data.repoId ?? null)
      if (data.repoId) await startSession(data.repoId)
    } catch (error) {
      console.error('[v0] Failed to load repo:', error)
    } finally {
      setIsIngesting(false)
      setIsLoadingPRs(false)
    }
  }, [startSession])

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

  // Try cache first; only ingest if the DB has no data for this repo
  const handleRepoSubmit = useCallback(async (repoStr: string) => {
    const hit = await loadFromCache(repoStr)
    if (!hit) await loadRepo(repoStr)
  }, [loadFromCache, loadRepo])

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
      if (!pr) return
      
      setLastAction(action)

      // Update stats
      setStats((prev) => ({
        ...prev,
        approved: action === 'approve' ? prev.approved + 1 : prev.approved,
        changesRequested: action === 'changes' ? prev.changesRequested + 1 : prev.changesRequested,
        skipped: action === 'skip' ? prev.skipped + 1 : prev.skipped,
      }))

      // Add to decision history
      setDecisionHistory((prev) => [
        {
          pr,
          action,
          decidedAt: new Date().toISOString(),
        },
        ...prev,
      ])

      // Update streak
      setStreak((prev) => (action !== 'skip' ? prev + 1 : 0))

      // Move to next card
      setCurrentIndex((prev) => prev + 1)

      // Record decision in DB (fire and forget)
      if (pr?.id && sessionId) {
        fetch('/api/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, prId: pr.id, action }),
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

      try {
        const res = await fetch('/api/deeper', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(byokKey ? { 'x-api-key': byokKey } : {}),
          },
          body: JSON.stringify({ action, prId: pr.id, repoId }),
        })
        const data = await res.json()
        return JSON.stringify(data, null, 2)
      } catch (error) {
        console.error('[swipe] Deeper action failed:', error)
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
        byokKey={byokKey}
        onToggleHints={() => setHintsOpen(true)}
        onRepoSubmit={handleRepoSubmit}
        onByokKeyChange={setByokKey}
        isLoading={isLoading}
      />

      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-4 py-6 pb-24 lg:flex-row lg:px-8 lg:pb-20">
        {/* Left column - Card stack or Session Summary */}
        <div className="w-full lg:w-[60%]">
          {isIngesting || isLoadingPRs ? (
            <IngestingState isIngesting={isIngesting} isLoadingPRs={isLoadingPRs} repo={repoInput} />
          ) : prList.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="font-mono text-sm text-foreground">Paste a GitHub repo to start reviewing</div>
              <div className="font-mono text-xs text-muted-foreground">
                e.g. <span className="text-foreground">resend/resend-node</span> or a full GitHub URL
              </div>
            </div>
          ) : currentIndex >= prList.length && viewMode === 'swipe' ? (
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
              {/* View switcher — shown once PRs are loaded */}
              <div className="mb-4 flex items-center justify-between">
                <ViewSwitcher current={viewMode} onChange={setViewMode} />
                {viewMode === 'swipe' && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {Math.max(0, prList.length - currentIndex)} remaining
                  </span>
                )}
              </div>

              {viewMode === 'swipe' && (
                <>
                  <CardStack prs={prList} currentIndex={currentIndex} onSwipe={handleSwipe} />
                  <ActionButtons onAction={handleSwipe} />
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

              {viewMode === 'risk-matrix' && (
                <ViewRiskMatrix prs={prList} currentIndex={currentIndex} onSelect={(i) => { setCurrentIndex(i); setViewMode('swipe') }} />
              )}

              {viewMode === 'contributor' && (
                <ViewContributorFocus prs={prList} currentIndex={currentIndex} onSelect={(i) => { setCurrentIndex(i); setViewMode('swipe') }} />
              )}

              {viewMode === 'category' && (
                <ViewCategoryGroup prs={prList} currentIndex={currentIndex} onSelect={(i) => { setCurrentIndex(i); setViewMode('swipe') }} />
              )}

              {viewMode === 'deps' && (
                <ViewDependencyGraph prs={prList} currentIndex={currentIndex} onSelect={(i) => { setCurrentIndex(i); setViewMode('swipe') }} />
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

      <BottomStrip stats={stats} onFilterClick={(action) => setHistoryFilter(action)} />

      <KeyboardHints open={hintsOpen} onClose={() => setHintsOpen(false)} />

      <AnimatePresence>
        {historyFilter && (
          <DecisionHistory
            decisions={decisionHistory.filter((d) => d.action === historyFilter)}
            action={historyFilter}
            onClose={() => setHistoryFilter(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
