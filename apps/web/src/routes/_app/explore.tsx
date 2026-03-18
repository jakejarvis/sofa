import { createFileRoute } from "@tanstack/react-router";

import { ExploreClient } from "@/components/explore/explore-client";

export const Route = createFileRoute("/_app/explore")({
  component: () => <ExploreClient />,
});
