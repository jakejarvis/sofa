import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";

const providerSchema = z.enum(["plex", "jellyfin", "emby", "sonarr", "radarr"]);

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await params;
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });

  db.delete(integrations)
    .where(
      and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, parsed.data),
      ),
    )
    .run();

  return new NextResponse(null, { status: 204 });
}
