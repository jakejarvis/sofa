import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getContinueWatchingFeed } from "@/lib/services/discovery";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = getContinueWatchingFeed(session.user.id);
  return NextResponse.json(feed);
}
