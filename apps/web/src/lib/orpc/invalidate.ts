import type { QueryClient } from "@tanstack/react-query";

import { trackingDerivedQueryKeys, trackingStateQueryKeys } from "@sofa/api/query-keys";

import { orpc } from "./client";

/**
 * Mark every query whose response depends on the user's tracking state
 * (statuses, watches, ratings, library membership) as stale. Active queries
 * refetch immediately; inactive ones refetch on next mount. Title details
 * (`titles.get`) are deliberately excluded — they don't depend on tracking.
 */
export function invalidateTrackingQueries(queryClient: QueryClient): Promise<unknown> {
  return Promise.all(
    [...trackingStateQueryKeys(orpc), ...trackingDerivedQueryKeys(orpc)].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}
