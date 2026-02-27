import { NextResponse } from "next/server";

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return apiError(message, 401);
}

export function badRequest(message = "Bad request") {
  return apiError(message, 400);
}

export function notFound(message = "Not found") {
  return apiError(message, 404);
}
