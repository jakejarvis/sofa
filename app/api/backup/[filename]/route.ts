import path from "node:path";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getBackupPath } from "@/lib/services/backup";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { filename } = await params;

  // Sanitize to prevent path traversal
  const safe = path.basename(filename);
  if (!safe || safe !== filename || safe.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const backupPath = await getBackupPath(safe);
  if (!backupPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = Bun.file(backupPath);
  const buffer = await file.arrayBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Content-Length": String(file.size),
    },
  });
}
