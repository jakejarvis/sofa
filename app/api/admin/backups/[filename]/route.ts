import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteBackup } from "@/lib/services/backup";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { filename } = await params;
  await deleteBackup(filename);

  return new NextResponse(null, { status: 204 });
}
