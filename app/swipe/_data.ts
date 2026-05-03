import type { PullRequest, AIContext, ChatMessage, SessionStats } from './_types'

export const MOCK_PRS: PullRequest[] = [
  {
    number: 1247,
    state: 'open',
    title: 'feat: add support for batch sending with idempotency keys',
    body: 'This PR adds idempotency key support to the batch sending endpoint, preventing duplicate sends when the client retries on network failures. Closes #1198.',
    author: {
      handle: 'maxschmitt',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1321745?v=4',
    },
    openedAt: '2 days ago',
    ciStatus: 'passing',
    filesChanged: 3,
    additions: 47,
    deletions: 12,
    diff: {
      filePath: 'src/api/batch.ts',
      lines: [
        { type: 'addition', content: "import { createIdempotencyKey } from '../utils/keys'" },
        { type: 'addition', content: '' },
        { type: 'deletion', content: 'export async function sendBatch(emails: Email[]) {' },
        { type: 'addition', content: 'export async function sendBatch(emails: Email[], opts?: { idempotencyKey?: string }) {' },
        { type: 'addition', content: '  const key = opts?.idempotencyKey ?? createIdempotencyKey()' },
      ],
    },
  },
  {
    number: 1246,
    state: 'open',
    title: 'fix: handle null reply-to in template rendering',
    body: 'Fixes a bug where null reply-to addresses would cause template rendering to fail silently.',
    author: {
      handle: 'ekrekr',
      avatarUrl: 'https://avatars.githubusercontent.com/u/12345678?v=4',
    },
    openedAt: '3 days ago',
    ciStatus: 'passing',
    filesChanged: 2,
    additions: 15,
    deletions: 3,
    diff: {
      filePath: 'src/templates/render.ts',
      lines: [
        { type: 'context', content: 'function renderTemplate(template: Template) {' },
        { type: 'deletion', content: '  const replyTo = template.replyTo' },
        { type: 'addition', content: '  const replyTo = template.replyTo ?? undefined' },
        { type: 'context', content: '  return compile(template, { replyTo })' },
      ],
    },
  },
  {
    number: 1245,
    state: 'open',
    title: 'docs: clarify webhook signature verification',
    body: 'Updates the webhook documentation to clarify the signature verification process and add code examples.',
    author: {
      handle: 'oscarjcs',
      avatarUrl: 'https://avatars.githubusercontent.com/u/87654321?v=4',
    },
    openedAt: '4 days ago',
    ciStatus: 'passing',
    filesChanged: 1,
    additions: 28,
    deletions: 5,
    diff: {
      filePath: 'docs/webhooks.md',
      lines: [
        { type: 'addition', content: '## Signature Verification' },
        { type: 'addition', content: '' },
        { type: 'addition', content: 'To verify webhook signatures, use the `verifySignature` helper:' },
        { type: 'addition', content: '```typescript' },
        { type: 'addition', content: "import { verifySignature } from '@resend/webhooks'" },
      ],
    },
  },
]

export const MOCK_AI_CONTEXT: AIContext = {
  risk: {
    score: 32,
    rationale: 'Adds optional parameter; existing callers unaffected. New utility lacks tests.',
  },
  summary: [
    'Adds optional `idempotencyKey` to batch send',
    'Auto-generates a key if not provided',
    'Wires it into the request payload',
  ],
  similarPRs: [
    { number: 1089, title: 'feat: idempotency for transactional sends', state: 'merged', date: '4 mo ago' },
    { number: 978, title: 'refactor: extract key generation utility', state: 'merged', date: '6 mo ago' },
    { number: 1156, title: 'feat: idempotency keys for webhooks', state: 'closed', date: '2 mo ago' },
  ],
  contributor: {
    handle: 'maxschmitt',
    avatarUrl: 'https://avatars.githubusercontent.com/u/1321745?v=4',
    priorPRs: 14,
    mergeRate: 92,
    firstPR: 'Mar 2024',
  },
}

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Show me where sendBatch is used elsewhere',
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Found 4 usages: src/api/transactional.ts (2), src/api/webhooks.ts (1), test/batch.test.ts (1). The transactional.ts usages don\'t pass idempotency keys yet — worth noting in the review.',
    toolCall: 'find_callers',
  },
]

export const MOCK_SESSION_STATS: SessionStats = {
  approved: 4,
  changesRequested: 2,
  skipped: 1,
}

export const MOCK_STREAK = 3
export const MOCK_TOTAL_PRS = 47
export const MOCK_CURRENT_PR_INDEX = 3
export const MOCK_REPO = 'resend/resend-node'
