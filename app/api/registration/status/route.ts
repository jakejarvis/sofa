import { NextResponse } from "next/server";
import {
  getOidcProviderName,
  isOidcConfigured,
  isPasswordLoginDisabled,
} from "@/lib/config";
import { isRegistrationOpen } from "@/lib/services/settings";

export async function GET() {
  return NextResponse.json({
    registrationOpen: await isRegistrationOpen(),
    oidcEnabled: isOidcConfigured(),
    oidcProviderName: isOidcConfigured() ? getOidcProviderName() : null,
    passwordLoginDisabled: isPasswordLoginDisabled(),
  });
}
