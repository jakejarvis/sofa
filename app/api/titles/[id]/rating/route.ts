import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { rateTitleStars } from "@/lib/services/tracking";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { ratingStars } = body;

  if (typeof ratingStars !== "number" || ratingStars < 0 || ratingStars > 5) {
    return NextResponse.json(
      { error: "ratingStars must be 0-5" },
      { status: 400 },
    );
  }

  await rateTitleStars(session.user.id, id, ratingStars);
  return NextResponse.json({ ok: true });
}
