import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });

export interface ImpactCaller {
  filename: string;
}

export interface ImpactSymbol {
  symbol: string;
  sourceFile: string;
  callers: ImpactCaller[];
}

export interface ImpactResult {
  changedFiles: Array<{ filename: string; symbols: string[] }>;
  symbols: ImpactSymbol[];
  mermaidGraph: string;
}

// Matches exported functions, classes, and consts that changed (+ lines only)
const EXPORT_PATTERNS: RegExp[] = [
  /^\+\s*export\s+(?:async\s+)?function\s*\*?\s*(\w+)/,
  /^\+\s*export\s+(?:const|let|var)\s+(\w+)\s*[=:]/,
  /^\+\s*export\s+(?:default\s+)?class\s+(\w+)/,
  /^\+\s*export\s+(?:type|interface)\s+(\w+)/,
  // non-exported top-level functions are still worth tracking as callers
  /^\+(?:async\s+)?function\s+(\w+)\s*\(/,
];

function extractSymbols(patch: string): string[] {
  const found = new Set<string>();
  for (const line of patch.split("\n")) {
    for (const re of EXPORT_PATTERNS) {
      const m = re.exec(line);
      if (m?.[1] && m[1].length > 2) found.add(m[1]); // skip single-letter symbols
    }
  }
  return Array.from(found);
}

async function findCallers(
  owner: string,
  repo: string,
  symbol: string,
  sourceFile: string
): Promise<string[]> {
  try {
    const { data } = await octokit.search.code({
      q: `${symbol} repo:${owner}/${repo}`,
      per_page: 10,
    });
    return data.items
      .map((item) => item.path)
      .filter((p) => p !== sourceFile)
      .slice(0, 6);
  } catch {
    return [];
  }
}

function shortName(path: string): string {
  return path.split("/").pop() ?? path;
}

function sanitizeMermaidId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, "_");
}

export async function buildImpactMap(
  owner: string,
  repo: string,
  files: Array<{ filename: string; patch: string | null }>
): Promise<ImpactResult> {
  // 1. Extract changed symbols per file
  const changedFiles: ImpactResult["changedFiles"] = [];
  for (const f of files.slice(0, 10)) {
    if (!f.patch) continue;
    const symbols = extractSymbols(f.patch);
    if (symbols.length > 0) changedFiles.push({ filename: f.filename, symbols });
  }

  // 2. Search for callers — max 4 symbols to stay within GitHub's 10 req/min search limit
  const candidates = changedFiles
    .flatMap((f) => f.symbols.slice(0, 2).map((s) => ({ symbol: s, sourceFile: f.filename })))
    .slice(0, 4);

  const symbolResults: ImpactSymbol[] = [];
  for (const { symbol, sourceFile } of candidates) {
    await new Promise((r) => setTimeout(r, 300)); // ~10 req/min safe zone
    const callerPaths = await findCallers(owner, repo, symbol, sourceFile);
    symbolResults.push({
      symbol,
      sourceFile,
      callers: callerPaths.map((filename) => ({ filename })),
    });
  }

  // 3. Build Mermaid graph
  const lines: string[] = ["graph LR"];
  const seen = new Set<string>();
  let hasEdges = false;

  for (const { symbol, sourceFile, callers } of symbolResults) {
    if (callers.length === 0) continue;
    hasEdges = true;

    const srcId = sanitizeMermaidId(shortName(sourceFile));
    if (!seen.has(srcId)) {
      lines.push(`  ${srcId}["${shortName(sourceFile)}"]:::changed`);
      seen.add(srcId);
    }

    for (const { filename } of callers) {
      const callerId = sanitizeMermaidId(shortName(filename)) + "_" + sanitizeMermaidId(filename.split("/")[0] ?? "r");
      if (!seen.has(callerId)) {
        lines.push(`  ${callerId}["${shortName(filename)}"]`);
        seen.add(callerId);
      }
      lines.push(`  ${callerId} -->|"${symbol}"| ${srcId}`);
    }
  }

  // No callers found — just show the changed files as nodes
  if (!hasEdges) {
    for (const { filename } of changedFiles.slice(0, 6)) {
      const id = sanitizeMermaidId(shortName(filename));
      lines.push(`  ${id}["${shortName(filename)}"]:::changed`);
    }
  }

  lines.push("  classDef changed fill:#22C55E20,stroke:#22C55E,color:#22C55E");

  return {
    changedFiles,
    symbols: symbolResults,
    mermaidGraph: lines.join("\n"),
  };
}
