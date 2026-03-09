import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getOrFetchTitle } from "@/lib/services/metadata";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await getOrFetchTitle(id);
  if (!result)
    return NextResponse.json({ error: "Title not found" }, { status: 404 });

  return NextResponse.json(result);
}
