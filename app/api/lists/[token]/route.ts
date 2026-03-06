import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getRadarrList,
  getSonarrList,
  parseStatusParam,
  resolveListToken,
} from "@/lib/services/lists";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = resolveListToken(token);
  if (!result) {
    return NextResponse.json([]);
  }

  const statuses = parseStatusParam(req.nextUrl.searchParams.get("status"));

  if (result.provider === "sonarr") {
    return NextResponse.json(await getSonarrList(result.userId, statuses));
  }
  return NextResponse.json(getRadarrList(result.userId, statuses));
}
