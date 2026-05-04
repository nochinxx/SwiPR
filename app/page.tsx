"use client"

import Link from "next/link"
import { ArrowRight, GitPullRequest, Zap, Brain, Keyboard, Github } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#22C55E]" />
            <span className="text-xl font-semibold tracking-tight text-foreground">SwiPR</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/swipe"
              className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Start Reviewing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#22C55E]/5 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
            <GitPullRequest className="h-4 w-4" />
            Open source PR review tool
          </div>
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Swipe through PRs like you&apos;re on a dating app
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            A card-based review experience for public GitHub repos. Get AI-powered context, 
            keyboard shortcuts, and a satisfying swipe interaction for every review.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/swipe"
              className="flex items-center gap-2 rounded-full bg-[#22C55E] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#22C55E]/20 transition-all hover:shadow-xl hover:shadow-[#22C55E]/30"
            >
              Try SwiPR Now
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="https://github.com/nochinxx/SwiPR"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-border bg-secondary px-8 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary/80"
            >
              <Github className="h-5 w-5" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-secondary/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Review PRs faster than ever
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to triage and review pull requests efficiently
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Swipe Gestures"
              description="Approve with a right swipe, request changes with a left swipe. Skip with a tap. It's that simple."
            />
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="AI-Powered Context"
              description="Get instant risk scores, change summaries, and relevant context about the contributor and similar PRs."
            />
            <FeatureCard
              icon={<Keyboard className="h-6 w-6" />}
              title="Keyboard Shortcuts"
              description="J to approve, F for changes, Space to skip. Power through your review queue without touching the mouse."
            />
            <FeatureCard
              icon={<GitPullRequest className="h-6 w-6" />}
              title="Diff Preview"
              description="See a compact diff preview right on the card. Expand for full context when you need it."
            />
            <FeatureCard
              icon={
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[#FF0080] text-xs font-bold text-white">
                  AI
                </span>
              }
              title="Go Deeper"
              description="Ask the AI assistant questions about any PR. Get explanations, find potential issues, understand the impact."
            />
            <FeatureCard
              icon={
                <span className="flex h-6 w-6 items-center justify-center font-mono text-lg font-bold">
                  3
                </span>
              }
              title="Card Stack"
              description="See upcoming PRs in the stack. Know what's coming next and plan your review session."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How it works
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <StepCard
              number="1"
              title="Enter a repo"
              description="Paste any public GitHub repo URL or use the format owner/repo"
            />
            <StepCard
              number="2"
              title="Swipe through PRs"
              description="Review each PR with swipe gestures or keyboard shortcuts"
            />
            <StepCard
              number="3"
              title="Build your streak"
              description="Track your reviews and build momentum with the streak counter"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-gradient-to-b from-secondary/50 to-background py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to speed up your reviews?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start swiping through PRs right now. No signup required.
          </p>
          <Link
            href="/swipe"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#22C55E] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#22C55E]/20 transition-all hover:shadow-xl hover:shadow-[#22C55E]/30"
          >
            Start Reviewing
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
            <span className="text-sm font-medium">SwiPR</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for the open source community
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-secondary/50">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#22C55E] font-mono text-xl font-bold text-white">
        {number}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
