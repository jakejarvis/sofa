import { useState } from "react";

import type { Season } from "@sofa/api/schemas";

import { TitleContext } from "./title-context";

export function TitleProvider({
  titleId,
  titleType,
  titleName,
  seasons: initialSeasons,
  children,
}: {
  titleId: string;
  titleType: "movie" | "tv";
  titleName: string;
  seasons: Season[];
  children: React.ReactNode;
}) {
  const [seasons, setSeasons] = useState(initialSeasons);
  const [watchingEp, setWatchingEp] = useState<string | null>(null);

  return (
    <TitleContext
      value={{
        titleId,
        titleType,
        titleName,
        seasons,
        setSeasons,
        watchingEp,
        setWatchingEp,
      }}
    >
      {children}
    </TitleContext>
  );
}
