import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PersonCredit, ResolvedPerson } from "@/lib/types";

// ----- Query key factories -----

export const personKeys = {
  detail: (id: string) => ["person", id] as const,
};

// ----- Response types -----

export interface PersonDetailResponse {
  person: ResolvedPerson;
  filmography: PersonCredit[];
  userStatuses: Record<string, "watchlist" | "in_progress" | "completed">;
}

// ----- Queries -----

export function usePersonDetail(
  id: string,
  initialData?: PersonDetailResponse,
) {
  return useQuery<PersonDetailResponse>({
    queryKey: personKeys.detail(id),
    queryFn: () => api<PersonDetailResponse>(`/people/${id}`),
    initialData,
  });
}
