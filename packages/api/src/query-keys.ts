type Keyed = { key(): readonly unknown[] };
type TrackingKeyedClient = {
  tracking: Keyed;
  library: Keyed;
  discover: Keyed;
  people: Keyed;
  titles: { similar: Keyed };
};

/**
 * Queries that directly show the user's tracking state (statuses, watches, ratings, library).
 * Mutations can wait on these so the UI reflects the change before they settle.
 */
export function trackingStateQueryKeys(orpc: TrackingKeyedClient): (readonly unknown[])[] {
  return [orpc.tracking.key(), orpc.library.key()];
}

/**
 * Queries whose results are derived from tracking state (recommendations, discover statuses,
 * similar titles, people credits). Refetch them after a change, but they can be slow (TMDB-backed).
 * `titles.get` is deliberately absent — title details don't depend on tracking.
 */
export function trackingDerivedQueryKeys(orpc: TrackingKeyedClient): (readonly unknown[])[] {
  return [orpc.discover.key(), orpc.people.key(), orpc.titles.similar.key()];
}
