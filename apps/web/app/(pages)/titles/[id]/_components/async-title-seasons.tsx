import { ensureTvHydrated } from "@/lib/services/metadata";
import { TitleSeasons } from "./title-seasons";

export async function AsyncTitleSeasons({
  titleId,
  tmdbId,
}: {
  titleId: string;
  tmdbId: number;
}) {
  const seasons = await ensureTvHydrated(titleId, tmdbId);
  if (seasons.length === 0) return null;
  return <TitleSeasons seasons={seasons} />;
}
