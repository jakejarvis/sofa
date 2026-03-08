import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const authRoutes = new Set(["/login", "/register"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // this is ONLY for optimistic redirects, it does not provide any actual security
  const sessionCookie = getSessionCookie(request);

  // Special case for root: becomes dashboard if logged in, landing page if not
  if (pathname === "/") {
    return sessionCookie
      ? NextResponse.rewrite(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  // Logged-in users on auth pages → dashboard
  if (authRoutes.has(pathname) && sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated users on protected pages → login
  if (!authRoutes.has(pathname) && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
