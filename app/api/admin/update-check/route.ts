import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { setSetting } from "@/lib/services/settings";

const schema = z.object({ enabled: z.boolean() });

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  setSetting("updateCheckEnabled", String(parsed.data.enabled));
  return new NextResponse(null, { status: 204 });
}
