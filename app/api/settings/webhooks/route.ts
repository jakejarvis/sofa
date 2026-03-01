import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { webhookConnections, webhookEventLog } from "@/lib/db/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await db
    .select()
    .from(webhookConnections)
    .where(eq(webhookConnections.userId, session.user.id))
    .all();

  // Fetch recent events for each connection
  const connectionsWithEvents = await Promise.all(
    connections.map(async (conn) => {
      const events = await db
        .select()
        .from(webhookEventLog)
        .where(eq(webhookEventLog.connectionId, conn.id))
        .orderBy(desc(webhookEventLog.receivedAt))
        .limit(10)
        .all();
      return { ...conn, recentEvents: events };
    }),
  );

  return NextResponse.json({ connections: connectionsWithEvents });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { provider, mediaServerUsername, enabled } = body;

  if (!provider || !["plex", "jellyfin"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (!mediaServerUsername || typeof mediaServerUsername !== "string") {
    return NextResponse.json(
      { error: "Media server username is required" },
      { status: 400 },
    );
  }

  // Check if connection already exists
  const existing = await db
    .select()
    .from(webhookConnections)
    .where(
      and(
        eq(webhookConnections.userId, session.user.id),
        eq(webhookConnections.provider, provider),
      ),
    )
    .get();

  if (existing) {
    // Update existing — preserve token, update username and enabled
    const connection = await db
      .update(webhookConnections)
      .set({
        mediaServerUsername: mediaServerUsername.trim(),
        enabled: typeof enabled === "boolean" ? enabled : existing.enabled,
      })
      .where(eq(webhookConnections.id, existing.id))
      .returning()
      .get();
    return NextResponse.json({ connection });
  }

  // Create new connection
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();

  const connection = await db
    .insert(webhookConnections)
    .values({
      userId: session.user.id,
      provider,
      token,
      mediaServerUsername: mediaServerUsername.trim(),
      enabled: true,
      createdAt: now,
    })
    .returning()
    .get();

  return NextResponse.json({ connection });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { provider } = body;

  if (!provider || !["plex", "jellyfin"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await db
    .delete(webhookConnections)
    .where(
      and(
        eq(webhookConnections.userId, session.user.id),
        eq(webhookConnections.provider, provider),
      ),
    )
    .run();

  return NextResponse.json({ ok: true });
}
