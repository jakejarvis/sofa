import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { logEpisodeWatchBatch } from "@/lib/services/tracking";

const schema = z.object({
  episodeIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  logEpisodeWatchBatch(session.user.id, parsed.data.episodeIds);

  return new NextResponse(null, { status: 204 });
}
