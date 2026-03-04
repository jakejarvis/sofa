"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { webhookConnections } from "@/lib/db/schema";
import { setSetting } from "@/lib/services/settings";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function saveWebhookConnection(
  provider: "plex" | "jellyfin",
  mediaServerUsername: string,
  enabled?: boolean,
) {
  const session = await getSession();

  if (!["plex", "jellyfin"].includes(provider)) {
    throw new Error("Invalid provider");
  }
  if (!mediaServerUsername?.trim()) {
    throw new Error("Media server username is required");
  }

  const existing = db
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
    const connection = db
      .update(webhookConnections)
      .set({
        mediaServerUsername: mediaServerUsername.trim(),
        enabled: typeof enabled === "boolean" ? enabled : existing.enabled,
      })
      .where(eq(webhookConnections.id, existing.id))
      .returning()
      .get();
    return {
      ...connection,
      lastEventAt: connection.lastEventAt?.toISOString() ?? null,
      createdAt: connection.createdAt.toISOString(),
    };
  }

  const token = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32)),
  ).toString("hex");
  const now = new Date();

  const connection = db
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

  return {
    ...connection,
    lastEventAt: connection.lastEventAt?.toISOString() ?? null,
    createdAt: connection.createdAt.toISOString(),
  };
}

export async function deleteWebhookConnection(provider: "plex" | "jellyfin") {
  const session = await getSession();

  if (!["plex", "jellyfin"].includes(provider)) {
    throw new Error("Invalid provider");
  }

  db.delete(webhookConnections)
    .where(
      and(
        eq(webhookConnections.userId, session.user.id),
        eq(webhookConnections.provider, provider),
      ),
    )
    .run();
}

export async function regenerateWebhookToken(provider: "plex" | "jellyfin") {
  const session = await getSession();

  if (!["plex", "jellyfin"].includes(provider)) {
    throw new Error("Invalid provider");
  }

  const newToken = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32)),
  ).toString("hex");

  const connection = db
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
    throw new Error("Connection not found");
  }

  return {
    ...connection,
    lastEventAt: connection.lastEventAt?.toISOString() ?? null,
    createdAt: connection.createdAt.toISOString(),
  };
}

export async function toggleRegistration(open: boolean) {
  const session = await getSession();

  if (session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  setSetting("registrationOpen", String(open));
}
