import type { CastMember } from "@/lib/types/title";
import { CastCarousel } from "./cast-carousel";

interface TitleCastProps {
  cast: CastMember[];
  titleType: "movie" | "tv";
}

export function TitleCast({ cast, titleType }: TitleCastProps) {
  const actors = cast.filter((c) => c.department === "Acting");
  const crew = cast.filter((c) => c.department !== "Acting");

  if (actors.length === 0 && crew.length === 0) return null;

  return <CastCarousel actors={actors} crew={crew} titleType={titleType} />;
}
