import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { restoreFromBackup } from "@/lib/services/backup";

const MAX_RESTORE_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_RESTORE_SIZE)
    return NextResponse.json({ error: "File too large" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  await restoreFromBackup(buffer);

  return new NextResponse(null, { status: 204 });
}
