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

export interface RiskBreakdown {
  score: number; // 0-100
  reasons: string[];
}

export function computeRiskScore(
  pr: Pick<PR, "additions" | "deletions" | "changedFiles" | "body" | "authorHandle">,
  files: Pick<PRFile, "filename" | "additions" | "deletions">[],
  contributorTotalPrs: number,
  contributorMergedPrs: number
): RiskBreakdown {
  let score = 0;
  const reasons: string[] = [];

  const totalLines = pr.additions + pr.deletions;

  // Large diff
  if (totalLines > 500) {
    score += 20;
    reasons.push(`Large diff: ${totalLines} lines changed`);
  } else if (totalLines > 200) {
    score += 10;
    reasons.push(`Medium diff: ${totalLines} lines changed`);
  }

  // Many files
  if (pr.changedFiles > 20) {
    score += 15;
    reasons.push(`${pr.changedFiles} files changed`);
  } else if (pr.changedFiles > 10) {
    score += 8;
  }

  // High-risk files (configs, lockfiles, CI)
  const riskyFiles = files.filter((f) =>
    HIGH_RISK_FILENAMES.some((re) => re.test(f.filename))
  );
  if (riskyFiles.length > 0) {
    score += 20;
    reasons.push(`Touches high-risk files: ${riskyFiles.map((f) => f.filename).join(", ")}`);
  }

  // No tests changed
  const hasTests = files.some((f) => TEST_FILENAMES.some((re) => re.test(f.filename)));
  if (!hasTests && pr.changedFiles > 3) {
    score += 10;
    reasons.push("No test files changed");
  }

  // Empty PR body
  if (!pr.body || pr.body.trim().length < 20) {
    score += 10;
    reasons.push("PR description is missing or very short");
  }

  // First-time or low-activity contributor
  if (contributorTotalPrs === 0) {
    score += 15;
    reasons.push("First PR from this contributor");
  } else if (contributorTotalPrs < 3) {
    score += 8;
    reasons.push(`New contributor: only ${contributorTotalPrs} prior PRs`);
  }

  // Low merge rate (if they have a history)
  if (contributorTotalPrs >= 5) {
    const mergeRate = contributorMergedPrs / contributorTotalPrs;
    if (mergeRate < 0.4) {
      score += 10;
      reasons.push(`Low historical merge rate: ${Math.round(mergeRate * 100)}%`);
    }
  }

  return { score: Math.min(score, 100), reasons };
}
