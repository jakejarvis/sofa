import { NextResponse } from "next/server";
import { isRegistrationOpen } from "@/lib/services/settings";

export async function GET() {
  const registrationOpen = await isRegistrationOpen();
  return NextResponse.json({ registrationOpen });
}
