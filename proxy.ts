import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const authRoutes = new Set(["/login", "/register"]);

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Logged-in users on auth pages → dashboard
  if (authRoutes.has(pathname) && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated users on protected pages → login
  if (!authRoutes.has(pathname) && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard",
    "/explore",
    "/settings",
    "/setup",
    "/titles/:path*",
  ],
};
