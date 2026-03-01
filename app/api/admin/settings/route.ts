import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSetting, setSetting } from "@/lib/services/settings";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const registrationOpen = (await getSetting("registrationOpen")) === "true";
  return NextResponse.json({ registrationOpen });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  if (typeof body.registrationOpen === "boolean") {
    await setSetting("registrationOpen", String(body.registrationOpen));
  }

  return NextResponse.json({ success: true });
}
