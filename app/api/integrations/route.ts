import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { integrationEvents, integrations } from "@/lib/db/schema";

const LIST_PROVIDERS = new Set(["sonarr", "radarr"]);

function integrationTypeFor(provider: string): "webhook" | "list" {
  return LIST_PROVIDERS.has(provider) ? "list" : "webhook";
}

function generateToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "hex",
  );
}

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userIntegrations = db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, session.user.id))
    .all();

  const result = userIntegrations.map((integration) => {
    const events = db
      .select()
      .from(integrationEvents)
      .where(eq(integrationEvents.integrationId, integration.id))
      .orderBy(desc(integrationEvents.receivedAt))
      .limit(10)
      .all();
    return {
      id: integration.id,
      provider: integration.provider,
      type: integration.type,
      token: integration.token,
      enabled: integration.enabled,
      lastEventAt: integration.lastEventAt?.toISOString() ?? null,
      createdAt: integration.createdAt.toISOString(),
      recentEvents: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        mediaType: e.mediaType,
        mediaTitle: e.mediaTitle,
        status: e.status,
        receivedAt: e.receivedAt.toISOString(),
      })),
    };
  });

  return NextResponse.json({ integrations: result });
}

const providerSchema = z.enum(["plex", "jellyfin", "emby", "sonarr", "radarr"]);

const createSchema = z.object({
  provider: providerSchema,
  enabled: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { provider, enabled } = parsed.data;
  const existing = db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, provider),
      ),
    )
    .get();

  if (existing) {
    if (enabled !== undefined) {
      const row = db
        .update(integrations)
        .set({ enabled })
        .where(eq(integrations.id, existing.id))
        .returning()
        .get();
      return NextResponse.json({
        ...row,
        lastEventAt: row.lastEventAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      });
    }
    return NextResponse.json({
      ...existing,
      lastEventAt: existing.lastEventAt?.toISOString() ?? null,
      createdAt: existing.createdAt.toISOString(),
    });
  }

  const row = db
    .insert(integrations)
    .values({
      userId: session.user.id,
      provider,
      type: integrationTypeFor(provider),
      token: generateToken(),
      enabled: enabled ?? true,
      createdAt: new Date(),
    })
    .returning()
    .get();

  return NextResponse.json(
    {
      ...row,
      lastEventAt: row.lastEventAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
