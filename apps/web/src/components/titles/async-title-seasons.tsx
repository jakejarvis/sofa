import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import { SeasonsSkeleton, TitleSeasons } from "./title-seasons";

export function AsyncTitleSeasons({
  titleId,
  tmdbId,
}: {
  titleId: string;
  tmdbId: number;
}) {
  const { data, isPending } = useQuery(
    orpc.titles.hydrateSeasons.queryOptions({
      input: { id: titleId, tmdbId },
    }),
  );

  if (isPending) return <SeasonsSkeleton />;
  if (!data?.seasons || data.seasons.length === 0) return null;
  return <TitleSeasons seasons={data.seasons} />;
}
