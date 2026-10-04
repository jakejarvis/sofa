import type { QueryClient } from "@tanstack/react-query";

import { orpc } from "./client";

/**
 * Mark every query whose response depends on the user's tracking state
 * (statuses, watches, ratings, library membership) as stale. Active queries
 * refetch immediately; inactive ones refetch on next mount. Title details
 * (`titles.get`) are deliberately excluded — they don't depend on tracking.
 */
export function invalidateTrackingQueries(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.tracking.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.library.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.discover.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.people.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.titles.similar.key() }),
  ]);
}
