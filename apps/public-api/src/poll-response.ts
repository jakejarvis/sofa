/**
 * Vercel Functions reject response bodies over 4.5 MB with 413 FUNCTION_PAYLOAD_TOO_LARGE.
 * The web client silently retries non-2xx polls with an already-used device code and ends
 * up showing "Device code expired", so return a readable fetch_error instead.
 */
export const MAX_POLL_RESPONSE_BYTES = 4_400_000;

export type AuthorizedPollBody =
  | { status: "authorized"; data: unknown }
  | { status: "fetch_error"; error: string };

export function authorizedPollBody(data: unknown): AuthorizedPollBody {
  const body = { status: "authorized" as const, data };
  const bytes = new TextEncoder().encode(JSON.stringify(body)).byteLength;
  if (bytes > MAX_POLL_RESPONSE_BYTES) {
    return {
      status: "fetch_error",
      error: "Your library is too large to import by signing in. Upload your export file instead.",
    };
  }
  return body;
}
