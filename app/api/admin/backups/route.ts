import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createBackup, listBackups } from "@/lib/services/backup";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const backups = await listBackups();
  return NextResponse.json({ backups });
}

export async function POST() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const backup = await createBackup();
  return NextResponse.json(backup, { status: 201 });
}
