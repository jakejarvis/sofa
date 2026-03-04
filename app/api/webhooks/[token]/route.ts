import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { webhookConnections } from "@/lib/db/schema";
import type { WebhookEvent } from "@/lib/services/webhooks";
import {
  parseJellyfinPayload,
  parsePlexPayload,
  processWebhook,
} from "@/lib/services/webhooks";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Look up connection by token — this IS the auth
  const connection = db
    .select()
    .from(webhookConnections)
    .where(eq(webhookConnections.token, token))
    .get();

  if (!connection || !connection.enabled) {
    // Always return 200 to avoid retry storms from media servers
    return NextResponse.json({ ok: true });
  }

  try {
    let event: WebhookEvent | null;
    if (connection.provider === "plex") {
      const formData = await req.formData();
      event = parsePlexPayload(formData);
    } else {
      const body = await req.json();
      event = parseJellyfinPayload(body);
    }

    if (!event) {
      // Not a relevant event type — silently ignore
      return NextResponse.json({ ok: true });
    }

    await processWebhook(
      connection.id,
      connection.userId,
      connection.provider,
      event,
    );
  } catch {
    // Swallow errors — never return non-200 to media servers
  }

  return NextResponse.json({ ok: true });
}
