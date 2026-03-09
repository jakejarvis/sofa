import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { removeTitleStatus, setTitleStatus } from "@/lib/services/tracking";

const schema = z.object({
  status: z.enum(["in_progress"]).nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id } = await params;
  if (parsed.data.status === null) {
    removeTitleStatus(session.user.id, id);
  } else {
    setTitleStatus(session.user.id, id, parsed.data.status);
  }

  return new NextResponse(null, { status: 204 });
}
