export interface PullRequest {
  id: string
  repoId: string
  number: number
  state: 'open' | 'closed' | 'merged'
  title: string
  body: string
  author: {
    handle: string
    avatarUrl: string
  }
  openedAt: string
  ciStatus: 'passing' | 'failing' | 'pending'
  filesChanged: number
  additions: number
  deletions: number
  diff: DiffPreview
  htmlUrl?: string
}

export interface DiffPreview {
  filePath: string
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'addition' | 'deletion' | 'context'
  content: string
}

export interface AIContext {
  risk: {
    score: number
    rationale: string
  }
  summary: string[]
  similarPRs: SimilarPR[]
  contributor: Contributor
}

export interface SimilarPR {
  number: number
  title: string
  state: 'merged' | 'closed' | 'open'
  date: string
}

export interface Contributor {
  handle: string
  avatarUrl: string
  priorPRs: number
  mergeRate: number
  firstPR: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCall?: string
}

export interface SessionStats {
  approved: number
  changesRequested: number
  skipped: number
}

export type SwipeAction = 'approve' | 'changes' | 'skip'
