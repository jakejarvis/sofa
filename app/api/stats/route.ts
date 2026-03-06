import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getWatchCount,
  getWatchHistory,
  type TimePeriod,
} from "@/lib/services/discovery";

const validTypes = ["movies", "episodes"] as const;
const validPeriods: TimePeriod[] = [
  "today",
  "this_week",
  "this_month",
  "this_year",
];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const period = searchParams.get("period");

  if (
    !type ||
    !period ||
    !validTypes.includes(type as (typeof validTypes)[number]) ||
    !validPeriods.includes(period as TimePeriod)
  ) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const typedType = type as "movies" | "episodes";
  const typedPeriod = period as TimePeriod;
  const count = getWatchCount(session.user.id, typedType, typedPeriod);

  if (searchParams.get("history") === "true") {
    const history = getWatchHistory(session.user.id, typedType, typedPeriod);
    return NextResponse.json({ count, history });
  }

  return NextResponse.json({ count });
}
