'use client'

import { motion } from 'framer-motion'
import type { AIContext, ChatMessage, SimilarPR } from '../_types'
import { useState } from 'react'
import { GitMerge, GitPullRequest, X } from 'lucide-react'

interface AIContextPanelProps {
  context: AIContext
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
}

export function AIContextPanel({ context, messages, onSendMessage }: AIContextPanelProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleQuickAction = (action: string) => {
    console.log('[v0] Quick action clicked:', action)
    onSendMessage(action)
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

        {/* Deeper section */}
        <div className="border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#FF0080]">Deeper</h3>
          <p className="mt-1 text-xs text-muted-foreground">Want more? Ask the assistant or tap a shortcut.</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {['Why is this risky?', 'Show me callers', 'What tests cover this?', 'Compare with main'].map(
              (action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="rounded-full border border-[#FF0080] bg-card px-3 py-1.5 text-xs font-medium text-[#FF0080] transition-colors hover:bg-[#FF0080]/10"
                >
                  {action}
                </button>
              )
            )}
          </div>
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
