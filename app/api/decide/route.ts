/**
 * POST /api/decide
 * Records a swipe decision directly — no MCP protocol overhead.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, decisions, sessions } from "@/db";

export async function POST(req: NextRequest) {
  const { sessionId, prId, action, note } = await req.json();

  if (!sessionId || !prId || !action) {
    return NextResponse.json({ error: "sessionId, prId, and action are required" }, { status: 400 });
  }

  const [decision] = await db
    .insert(decisions)
    .values({ sessionId, prId, action, note })
    .returning();

  await db
    .update(sessions)
    .set({ decisionsCount: sql`${sessions.decisionsCount} + 1` })
    .where(eq(sessions.id, sessionId));

  return NextResponse.json(decision);
}
