"use client";

import type { PersonCredit, ResolvedPerson } from "@sofa/api/schemas";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/tanstack";
import { FilmographyGrid } from "./filmography-grid";
import { PersonHero } from "./person-hero";

export function PersonDetailSkeleton() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <Skeleton className="size-40 shrink-0 self-center rounded-2xl sm:size-56 sm:self-start" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-2/3 sm:h-12" />
          <Skeleton className="h-5 w-24 rounded-md" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
