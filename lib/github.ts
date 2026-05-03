import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
});

export interface GithubPR {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  user: { login: string; avatar_url: string } | null;
  additions: number;
  deletions: number;
  changed_files: number;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

export interface GithubPRFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  patch?: string;
}

export async function fetchOpenPRs(owner: string, name: string): Promise<GithubPR[]> {
  const prs: GithubPR[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.pulls.list({
      owner,
      repo: name,
      state: "open",
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    // Fetch full PR details (additions/deletions are not in the list endpoint)
    const detailed = await Promise.all(
      data.map((pr) =>
        octokit.pulls.get({ owner, repo: name, pull_number: pr.number }).then((r) => r.data)
      )
    );

    prs.push(
      ...detailed.map((pr) => ({
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state as "open" | "closed",
        html_url: pr.html_url,
        user: pr.user ? { login: pr.user.login, avatar_url: pr.user.avatar_url } : null,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at ?? null,
      }))
    );

    if (data.length < 100) break;
    page++;
  }

  return prs;
}

export async function fetchPRFiles(
  owner: string,
  name: string,
  pullNumber: number
): Promise<GithubPRFile[]> {
  const files: GithubPRFile[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo: name,
      pull_number: pullNumber,
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    files.push(
      ...data.map((f) => ({
        filename: f.filename,
        status: f.status as GithubPRFile["status"],
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      }))
    );

    if (data.length < 100) break;
    page++;
  }

  return files;
}

export async function fetchFileContent(
  owner: string,
  name: string,
  path: string,
  ref?: string
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: name, path, ref });
    if ("content" in data && typeof data.content === "string") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchRepoPRHistory(
  owner: string,
  name: string,
  authorHandle: string
): Promise<{ total: number; merged: number; firstAt: string | null }> {
  const { data } = await octokit.pulls.list({
    owner,
    repo: name,
    state: "all",
    per_page: 100,
  });

  const authorPRs = data.filter((pr) => pr.user?.login === authorHandle);
  const merged = authorPRs.filter((pr) => pr.merged_at !== null).length;
  const firstAt =
    authorPRs.length > 0
      ? authorPRs.reduce((min, pr) => (pr.created_at < min ? pr.created_at : min), authorPRs[0].created_at)
      : null;

  return { total: authorPRs.length, merged, firstAt };
}
