import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { webhookConnections } from "@/lib/db/schema";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { provider } = body;

  if (!provider || !["plex", "jellyfin"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const newToken = crypto.randomBytes(32).toString("hex");

  const connection = await db
    .update(webhookConnections)
    .set({ token: newToken })
    .where(
      and(
        eq(webhookConnections.userId, session.user.id),
        eq(webhookConnections.provider, provider),
      ),
    )
    .returning()
    .get();

  if (!connection) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ connection });
}
