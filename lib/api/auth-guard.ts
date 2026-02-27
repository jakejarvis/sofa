import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireAuth(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new AuthError();
  }
  return session.user.id;
}

export class AuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}
