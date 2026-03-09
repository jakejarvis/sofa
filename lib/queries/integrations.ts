import { useQuery } from "@tanstack/react-query";
import type { IntegrationConnection } from "@/app/(pages)/settings/_components/integration-card";
import { api } from "@/lib/api-client";

// ----- Query key factories -----

export const integrationKeys = {
  list: ["integrations"] as const,
};

// ----- Response types -----

interface IntegrationsResponse {
  integrations: IntegrationConnection[];
}

// ----- Queries -----

export function useIntegrations() {
  return useQuery<IntegrationsResponse>({
    queryKey: integrationKeys.list,
    queryFn: () => api<IntegrationsResponse>("/integrations"),
  });
}
