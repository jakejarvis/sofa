import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { fetchFullFilmography } from "@/lib/services/person";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const filmography = await fetchFullFilmography(id);

  return NextResponse.json({ filmography });
}
