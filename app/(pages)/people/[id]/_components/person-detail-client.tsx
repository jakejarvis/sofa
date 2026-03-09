"use client";

import { useQuery } from "@tanstack/react-query";
import { PersonDetailSkeleton } from "@/components/skeletons";
import type { PersonCredit, ResolvedPerson } from "@/lib/orpc/schemas";
import { orpc } from "@/lib/orpc/tanstack";
import { FilmographyGrid } from "./filmography-grid";
import { PersonHero } from "./person-hero";

export interface PersonDetailResponse {
  person: ResolvedPerson;
  filmography: PersonCredit[];
  userStatuses: Record<string, "watchlist" | "in_progress" | "completed">;
}

export function PersonDetailClient({
  id,
  initialData,
}: {
  id: string;
  initialData?: PersonDetailResponse;
}) {
  const { data, isPending } = useQuery({
    ...orpc.people.detail.queryOptions({ input: { id } }),
    initialData,
  });

  if (isPending) return <PersonDetailSkeleton />;
  if (!data) return null;

  return (
    <div className="space-y-10">
      <PersonHero person={data.person} />
      <FilmographyGrid
        credits={data.filmography}
        userStatuses={data.userStatuses}
      />
    </div>
  );
}
