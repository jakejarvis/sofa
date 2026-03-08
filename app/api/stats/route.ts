import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getWatchCount, getWatchHistory } from "@/lib/services/discovery";

const paramsSchema = z.object({
  type: z.enum(["movies", "episodes"]),
  period: z.enum(["today", "this_week", "this_month", "this_year"]),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = paramsSchema.safeParse({
    type: req.nextUrl.searchParams.get("type"),
    period: req.nextUrl.searchParams.get("period"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid type or period parameter" },
      { status: 400 },
    );
  }

  const { type, period } = parsed.data;
  const count = getWatchCount(session.user.id, type, period);
  const history = getWatchHistory(session.user.id, type, period);

  return NextResponse.json({ count, history });
}
