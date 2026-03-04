import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { createLogger } from "@/lib/logger";

const log = createLogger("health");

export async function GET() {
  try {
    db.run(sql`SELECT 1`);

    return NextResponse.json({ status: "healthy" }, { status: 200 });
  } catch (err) {
    log.error("Health check failed:", err);
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
