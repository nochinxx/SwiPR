/**
 * POST /api/session — create a new session
 * GET  /api/session/:id — get session summary
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, sessions, decisions } from "@/db";

export async function POST(req: NextRequest) {
  const { repoId } = await req.json().catch(() => ({}));

  const [session] = await db
    .insert(sessions)
    .values({ repoId: repoId ?? null })
    .returning();

  return NextResponse.json(session);
}

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("id");
  if (!sessionId) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const allDecisions = await db
    .select({ action: decisions.action })
    .from(decisions)
    .where(eq(decisions.sessionId, sessionId));

  const approved = allDecisions.filter((d) => d.action === "approve").length;
  const changesRequested = allDecisions.filter((d) => d.action === "changes").length;
  const skipped = allDecisions.filter((d) => d.action === "skip").length;

  return NextResponse.json({
    ...session,
    approved,
    changesRequested,
    skipped,
    total: allDecisions.length,
    approvalRate: allDecisions.length > 0 ? Math.round((approved / allDecisions.length) * 100) : 0,
  });
}
