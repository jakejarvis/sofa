import { QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });
}

let browserClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserClient) browserClient = makeQueryClient();
  return browserClient;
}
