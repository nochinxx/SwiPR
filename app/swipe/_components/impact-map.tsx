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

function fileExt(path: string): string {
  return path.split('.').pop() ?? ''
}

function extColor(ext: string): string {
  if (['ts', 'tsx', 'js', 'jsx', 'mjs'].includes(ext)) return 'text-blue-400'
  if (['css', 'scss', 'sass'].includes(ext)) return 'text-pink-400'
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) return 'text-amber-400'
  if (['md', 'mdx'].includes(ext)) return 'text-slate-400'
  if (['py', 'rb', 'go', 'rs', 'java'].includes(ext)) return 'text-purple-400'
  return 'text-muted-foreground'
}

function FileList({ files }: { readonly files: ImpactResult['changedFiles'] }) {
  return (
    <div className="space-y-1">
      {files.map((f, i) => {
        const ext = fileExt(f.filename)
        const color = extColor(ext)
        const hasSymbols = f.symbols.length > 0
        return (
          <motion.div
            key={f.filename}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: i * 0.04 }}
            className="flex items-center gap-2"
          >
            <FileCode className={`h-3 w-3 shrink-0 ${hasSymbols ? 'text-[#22C55E]' : color}`} />
            <span className={`truncate font-mono text-xs ${hasSymbols ? 'text-[#22C55E]' : 'text-muted-foreground'}`}>
              {shortName(f.filename)}
            </span>
            {hasSymbols && (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {f.symbols.slice(0, 2).join(', ')}
                {f.symbols.length > 2 && ` +${f.symbols.length - 2}`}
              </span>
            )}
            {(f.additions != null || f.deletions != null) && !hasSymbols && (
              <span className="ml-auto shrink-0 font-mono text-[10px]">
                {f.additions != null && f.additions > 0 && <span className="text-[#22C55E]">+{f.additions}</span>}
                {f.deletions != null && f.deletions > 0 && <span className="ml-1 text-[#DC2626]">-{f.deletions}</span>}
              </span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
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

  // No data at all — shouldn't happen after the route fix, but keep a minimal fallback
  if (!impact || impact.changedFiles.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted-foreground/40 italic">
        No file data available.
      </p>
    )
  }

  const hasCallers = impact.symbols.some((s) => s.callers.length > 0)

  // No callers found — file list is the whole view
  if (!hasCallers) {
    return (
      <div className="space-y-2">
        <FileList files={impact.changedFiles} />
        <p className="font-mono text-[10px] text-muted-foreground/50">
          No cross-file callers found.
        </p>
      </div>
    )
  }

  // Full impact tree: symbol → callers, file list below
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
            <div className="flex items-center gap-1.5">
              <GitBranch className="h-3 w-3 shrink-0 text-[#22C55E]" />
              <span className="font-mono text-xs font-semibold text-[#22C55E]">{symbol}</span>
              <span className="truncate font-mono text-[10px] text-muted-foreground/60">
                in {shortName(sourceFile)}
              </span>
            </div>
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
                  <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground">
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

      {/* All changed files below the caller tree */}
      <div className="border-t border-border pt-3">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
          All changed files
        </p>
        <FileList files={impact.changedFiles} />
      </div>
    </div>
  )
}
