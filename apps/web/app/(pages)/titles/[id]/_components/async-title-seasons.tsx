import { serverClient } from "@/lib/orpc/client.server";
import { TitleSeasons } from "./title-seasons";

export async function AsyncTitleSeasons({
  titleId,
  tmdbId,
}: {
  titleId: string;
  tmdbId: number;
}) {
  const { seasons } = await serverClient.titles.hydrateSeasons({
    id: titleId,
    tmdbId,
  });
  if (seasons.length === 0) return null;
  return <TitleSeasons seasons={seasons} />;
}
