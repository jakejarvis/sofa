import { NextResponse } from "next/server";
import { client } from "@/lib/db/client";

export async function GET() {
  try {
    await client.execute("SELECT 1");

    return NextResponse.json({ status: "healthy" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
