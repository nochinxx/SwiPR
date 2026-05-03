import type { DiffLine, DiffPreview } from "@/app/swipe/_types";

export function parsePatch(patch: string, filename: string, maxLines = 8): DiffPreview {
  const lines: DiffLine[] = [];

  for (const raw of patch.split("\n")) {
    if (lines.length >= maxLines) break;
    if (raw.startsWith("@@") || raw.startsWith("\\")) continue;

    if (raw.startsWith("+")) {
      lines.push({ type: "addition", content: raw.slice(1) });
    } else if (raw.startsWith("-")) {
      lines.push({ type: "deletion", content: raw.slice(1) });
    } else {
      lines.push({ type: "context", content: raw.slice(1) });
    }
  }

  return { filePath: filename, lines };
}

export function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
