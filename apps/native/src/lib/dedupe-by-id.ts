/** Keep the first occurrence of each id (TMDB pages can repeat a title as rankings shift). */
export function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}
