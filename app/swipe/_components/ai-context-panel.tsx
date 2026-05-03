'use client'

import { motion } from 'framer-motion'
import type { AIContext, ChatMessage, SimilarPR } from '../_types'
import { useState } from 'react'
import { GitMerge, GitPullRequest, X, AlertTriangle, Search, FlaskConical, GitCompare, Loader2 } from 'lucide-react'

type DeeperAction = 'risk_verbose' | 'callers' | 'tests' | 'compare'

interface AIContextPanelProps {
  context: AIContext
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  onDeeperAction?: (action: DeeperAction) => Promise<string>
}

const DEEPER_ACTIONS = [
  { key: 'risk_verbose' as DeeperAction, label: 'Why is this risky?', icon: AlertTriangle },
  { key: 'callers' as DeeperAction, label: 'Show me callers', icon: Search },
  { key: 'tests' as DeeperAction, label: 'What tests cover this?', icon: FlaskConical },
  { key: 'compare' as DeeperAction, label: 'Compare with main', icon: GitCompare },
]

export function AIContextPanel({ context, messages, onSendMessage, onDeeperAction }: AIContextPanelProps) {
  const [input, setInput] = useState('')
  const [loadingAction, setLoadingAction] = useState<DeeperAction | null>(null)
  const [deeperResult, setDeeperResult] = useState<{ action: DeeperAction; label: string; content: string } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleDeeperClick = async (action: DeeperAction, label: string) => {
    if (!onDeeperAction || loadingAction) return
    
    setLoadingAction(action)
    setDeeperResult(null)
    
    try {
      const result = await onDeeperAction(action)
      setDeeperResult({ action, label, content: result })
    } catch (error) {
      setDeeperResult({ action, label, content: 'Failed to load result. Please try again.' })
    } finally {
      setLoadingAction(null)
    }
  }

  const dismissResult = () => {
    setDeeperResult(null)
  }

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-[#22C55E]'
    if (score <= 60) return 'text-amber-500'
    return 'text-[#DC2626]'
  }

  return (
    <div className="flex h-full flex-col">
      {/* Context section */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Context</h3>

        {/* Risk card */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`font-mono text-5xl font-bold tabular-nums ${getRiskColor(context.risk.score)}`}>
              {context.risk.score}
            </span>
            <span className="font-mono text-sm text-muted-foreground">/ 100</span>
          </div>
          <p className="mt-2 text-sm text-card-foreground">{context.risk.rationale}</p>
        </motion.div>

        {/* Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What This Does</div>
          <ol className="mt-3 space-y-2">
            {context.summary.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-muted-foreground">{i + 1}</span>
                <span className="text-card-foreground">{item}</span>
              </li>
            ))}
          </ol>
        </motion.div>

        {/* Similar PRs card */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Similar PRs</div>
          <div className="mt-3 space-y-1">
            {context.similarPRs.map((pr) => (
              <SimilarPRRow key={pr.number} pr={pr} />
            ))}
          </div>
        </motion.div>

        {/* Contributor card */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contributor</div>
          <div className="mt-3 flex items-center gap-3">
            <img
              src={context.contributor.avatarUrl}
              alt={context.contributor.handle}
              className="h-8 w-8 rounded-full"
              crossOrigin="anonymous"
            />
            <div>
              <div className="font-mono text-sm text-foreground">@{context.contributor.handle}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {context.contributor.priorPRs} prior PRs · {context.contributor.mergeRate}% merge rate
              </div>
              <div className="text-xs text-muted-foreground/70">first PR {context.contributor.firstPR}</div>
            </div>
          </div>
        </motion.div>

        {/* DEEPER section */}
        <div className="border-t border-border pt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">DEEPER</h3>

          <div className="mt-3 flex flex-wrap gap-2">
            {DEEPER_ACTIONS.map(({ key, label, icon: Icon }) => {
              const isLoading = loadingAction === key
              const isDisabled = !onDeeperAction || (loadingAction !== null && !isLoading)
              
              return (
                <motion.button
                  key={key}
                  onClick={() => handleDeeperClick(key, label)}
                  disabled={isDisabled}
                  whileHover={!isDisabled ? { scale: 1.02 } : undefined}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs transition-all ${
                    isDisabled && !isLoading
                      ? 'cursor-not-allowed border-muted-foreground/30 text-muted-foreground/50'
                      : isLoading
                        ? 'border-[#FF0080] text-[#FF0080] animate-pulse'
                        : 'cursor-pointer border-[#FF0080]/40 text-[#FF0080] hover:border-[#FF0080] hover:bg-[#FF0080]/10'
                  }`}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    >
                      <Loader2 className="h-3 w-3" />
                    </motion.div>
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                  {label}
                </motion.button>
              )
            })}
          </div>

          {/* Deeper result card */}
          {deeperResult && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative mt-3 rounded-xl border border-[#FF0080]/20 bg-[#FF0080]/5 p-3"
            >
              <button
                onClick={dismissResult}
                className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-[#FF0080]/10 hover:text-[#FF0080]"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#FF0080]">
                {deeperResult.label}
              </div>
              <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-foreground">
                {deeperResult.content}
              </p>
            </motion.div>
          )}
        </div>

        {/* Chat thread */}
        {messages.length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg p-3 ${
                  message.role === 'assistant'
                    ? 'bg-secondary text-left'
                    : 'ml-auto max-w-[85%] bg-card border border-border text-right'
                }`}
              >
                {message.toolCall && (
                  <div className="mb-1 font-mono text-xs text-muted-foreground">→ called {message.toolCall}</div>
                )}
                <p className="text-sm text-foreground">{message.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat input */}
      <form onSubmit={handleSubmit} className="border-t border-border pt-4">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this PR..."
            className="w-full rounded-lg border border-border bg-card px-4 py-3 pr-12 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-[#FF0080] focus:outline-none focus:ring-1 focus:ring-[#FF0080]"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
            ↵
          </span>
        </div>
      </form>
    </div>
  )
}

function SimilarPRRow({ pr }: { pr: SimilarPR }) {
  const getStateIcon = () => {
    if (pr.state === 'merged') {
      return <GitMerge className="h-4 w-4 text-purple-500" />
    }
    if (pr.state === 'closed') {
      return <X className="h-4 w-4 text-[#DC2626]" />
    }
    return <GitPullRequest className="h-4 w-4 text-amber-500" />
  }

  return (
    <button className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary">
      <div className="transition-transform group-hover:translate-x-0.5">{getStateIcon()}</div>
      <span className="flex-1 truncate text-sm text-card-foreground">{pr.title}</span>
      <span className="font-mono text-xs text-muted-foreground">{pr.date}</span>
      <div className="absolute left-0 h-full w-0.5 rounded bg-[#FF0080] opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}
