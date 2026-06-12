import type { PR, PRFile } from "@/db/schema";

const HIGH_RISK_FILENAMES = [
  /package\.json$/,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /\.env/,
  /drizzle\.config/,
  /next\.config/,
  /tsconfig/,
  /Dockerfile/,
  /docker-compose/,
  /\.github\/workflows/,
];

const TEST_FILENAMES = [/\.test\.(ts|tsx|js|jsx)$/, /\.spec\.(ts|tsx|js|jsx)$/, /__tests__\//];

export type RiskSource = 'diff' | 'config' | 'contributor'

export interface RiskReason {
  text: string;
  source: RiskSource;
}

export interface RiskBreakdown {
  score: number; // 0-100
  reasons: RiskReason[];
}

export function computeRiskScore(
  pr: Pick<PR, "additions" | "deletions" | "changedFiles" | "body" | "authorHandle">,
  files: Pick<PRFile, "filename" | "additions" | "deletions">[],
  contributorTotalPrs: number,
  contributorMergedPrs: number
): RiskBreakdown {
  let score = 0;
  const reasons: RiskReason[] = [];

  const totalLines = pr.additions + pr.deletions;

  if (totalLines > 500) {
    score += 20;
    reasons.push({ text: `Large diff: ${totalLines} lines changed`, source: 'diff' });
  } else if (totalLines > 200) {
    score += 10;
    reasons.push({ text: `Medium diff: ${totalLines} lines changed`, source: 'diff' });
  }

  if (pr.changedFiles > 20) {
    score += 15;
    reasons.push({ text: `${pr.changedFiles} files changed`, source: 'diff' });
  } else if (pr.changedFiles > 10) {
    score += 8;
  }

  const riskyFiles = files.filter((f) =>
    HIGH_RISK_FILENAMES.some((re) => re.test(f.filename))
  );
  if (riskyFiles.length > 0) {
    score += 20;
    reasons.push({ text: `Touches high-risk files: ${riskyFiles.map((f) => f.filename).join(", ")}`, source: 'config' });
  }

  const hasTests = files.some((f) => TEST_FILENAMES.some((re) => re.test(f.filename)));
  if (!hasTests && pr.changedFiles > 3) {
    score += 10;
    reasons.push({ text: "No test files changed", source: 'diff' });
  }

  if (!pr.body || pr.body.trim().length < 20) {
    score += 10;
    reasons.push({ text: "PR description is missing or very short", source: 'diff' });
  }

  if (contributorTotalPrs === 0) {
    score += 15;
    reasons.push({ text: "First PR from this contributor", source: 'contributor' });
  } else if (contributorTotalPrs < 3) {
    score += 8;
    reasons.push({ text: `New contributor: only ${contributorTotalPrs} prior PRs`, source: 'contributor' });
  }

  if (contributorTotalPrs >= 5) {
    const mergeRate = contributorMergedPrs / contributorTotalPrs;
    if (mergeRate < 0.4) {
      score += 10;
      reasons.push({ text: `Low historical merge rate: ${Math.round(mergeRate * 100)}%`, source: 'contributor' });
    }
  }

  return { score: Math.min(score, 100), reasons };
}
