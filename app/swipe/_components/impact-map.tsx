'use client'

import { motion } from 'framer-motion'
import { GitBranch, ArrowLeftToLine, FileCode } from 'lucide-react'
import type { ImpactResult } from '../_types'

interface ImpactMapProps {
  readonly impact: ImpactResult | null
  readonly isLoading: boolean
}

function shortName(path: string): string {
  return path.split('/').pop() ?? path
}

export function ImpactMap({ impact, isLoading }: ImpactMapProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-2.5 w-28 animate-pulse rounded bg-secondary" />
        <div className="ml-4 space-y-1.5">
          <div className="h-2.5 w-36 animate-pulse rounded bg-secondary" />
          <div className="h-2.5 w-32 animate-pulse rounded bg-secondary" />
          <div className="h-2.5 w-40 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    )
  }

  if (!impact) return null

  const hasCallers = impact.symbols.some((s) => s.callers.length > 0)

  // No exported symbols found in diff — just list changed files
  if (impact.changedFiles.length === 0) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        No exported symbols detected in this diff.
      </p>
    )
  }

  // Symbols found but no callers in repo
  if (!hasCallers) {
    return (
      <div className="space-y-1">
        {impact.changedFiles.map((f, i) => (
          <motion.div
            key={f.filename}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: i * 0.04 }}
            className="flex items-center gap-2"
          >
            <FileCode className="h-3 w-3 shrink-0 text-[#22C55E]" />
            <span className="truncate font-mono text-xs text-[#22C55E]">
              {shortName(f.filename)}
            </span>
            {f.symbols.length > 0 && (
              <span className="truncate font-mono text-[10px] text-muted-foreground">
                {f.symbols.slice(0, 2).join(', ')}
              </span>
            )}
          </motion.div>
        ))}
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          No callers found in this repo.
        </p>
      </div>
    )
  }

  // Full impact tree: symbol → callers
  return (
    <div className="space-y-4">
      {impact.symbols
        .filter((s) => s.callers.length > 0)
        .map(({ symbol, sourceFile, callers }, i) => (
          <motion.div
            key={symbol}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.06 }}
          >
            {/* Changed symbol header */}
            <div className="flex items-center gap-1.5">
              <GitBranch className="h-3 w-3 shrink-0 text-[#22C55E]" />
              <span className="font-mono text-xs font-semibold text-[#22C55E]">
                {symbol}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/60 truncate">
                in {shortName(sourceFile)}
              </span>
            </div>

            {/* Callers */}
            <div className="ml-3 mt-1.5 space-y-1 border-l border-border pl-3">
              {callers.map(({ filename }, j) => (
                <motion.div
                  key={filename}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12, delay: i * 0.06 + j * 0.03 }}
                  className="group flex items-center gap-1.5"
                >
                  <ArrowLeftToLine className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />
                  <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    {shortName(filename)}
                  </span>
                  <span className="hidden truncate font-mono text-[10px] text-muted-foreground/40 sm:block">
                    {filename}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
    </div>
  )
}
