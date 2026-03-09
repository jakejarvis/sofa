import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { rateTitleStars } from "@/lib/services/tracking";

const schema = z.object({
  stars: z.number().int().min(0).max(5),
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
  rateTitleStars(session.user.id, id, parsed.data.stars);

  return new NextResponse(null, { status: 204 });
}
