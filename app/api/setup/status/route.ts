import { NextResponse } from "next/server";
import { isTmdbConfigured } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    tmdbConfigured: isTmdbConfigured(),
  });
}
