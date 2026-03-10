/**
 * Server-side configuration checks.
 * Call these in route handlers or server components — never on the client.
 */

export function isTmdbConfigured(): boolean {
  return !!process.env.TMDB_API_READ_ACCESS_TOKEN;
}
