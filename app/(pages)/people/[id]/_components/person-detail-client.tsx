"use client";

import { PersonDetailSkeleton } from "@/components/skeletons";
import {
  type PersonDetailResponse,
  usePersonDetail,
} from "@/lib/queries/people";
import { FilmographyGrid } from "./filmography-grid";
import { PersonHero } from "./person-hero";

export function PersonDetailClient({
  id,
  initialData,
}: {
  id: string;
  initialData?: PersonDetailResponse;
}) {
  const { data, isPending } = usePersonDetail(id, initialData);

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
