import { useLingui } from "@lingui/react/macro";
import { IconLoader, IconSearch } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { FeedSection } from "@/components/dashboard/feed-section";
import { TitleGrid } from "@/components/dashboard/title-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { orpc } from "@/lib/orpc/client";

const DECADE_PRESETS = [
  { label: "2020s", min: 2020, max: 2029 },
  { label: "2010s", min: 2010, max: 2019 },
  { label: "2000s", min: 2000, max: 2009 },
  { label: "1990s", min: 1990, max: 1999 },
  { label: "1980s", min: 1980, max: 1989 },
  { label: "1970s", min: 1970, max: 1979 },
  { label: "Pre-1970", min: 1900, max: 1969 },
] as const;

const RATING_PRESETS = [
  { label: "7+", value: 7 },
  { label: "6+", value: 6 },
  { label: "5+", value: 5 },
] as const;

const SORT_OPTIONS = [
  { value: "popularity.desc", labelKey: "Most popular" },
  { value: "vote_average.desc", labelKey: "Highest rated" },
  { value: "primary_release_date.desc", labelKey: "Newest" },
  { value: "primary_release_date.asc", labelKey: "Oldest" },
] as const;

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "hi", name: "Hindi" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
] as const;

export function DiscoverSection() {
  const { t } = useLingui();

  const [type, setType] = useState<"movie" | "tv">("movie");
  const [genreId, setGenreId] = useState<number | undefined>(undefined);
  const [yearMin, setYearMin] = useState<number | undefined>(undefined);
  const [yearMax, setYearMax] = useState<number | undefined>(undefined);
  const [ratingMin, setRatingMin] = useState<number | undefined>(undefined);
  type DiscoverSortBy =
    | "popularity.desc"
    | "vote_average.desc"
    | "primary_release_date.desc"
    | "primary_release_date.asc";
  const [sortBy, setSortBy] = useState<DiscoverSortBy | undefined>(undefined);
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [providerId, setProviderId] = useState<number | undefined>(undefined);

  const { data: genreData } = useQuery(orpc.explore.genres.queryOptions({ input: { type } }));
  const { data: providerData } = useQuery(
    orpc.explore.watchProviders.queryOptions({ input: { type } }),
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery(
    orpc.discover.infiniteOptions({
      input: (pageParam: number) => ({
        type,
        genreId,
        yearMin,
        yearMax,
        ratingMin,
        sortBy,
        language,
        providerId,
        page: pageParam,
      }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      maxPages: 10,
    }),
  );

  const sentinelRef = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data?.pages]);

  const genres = genreData?.genres ?? [];
  const providers = providerData?.providers ?? [];

  const sortLabels: Record<string, string> = {
    "popularity.desc": t`Most popular`,
    "vote_average.desc": t`Highest rated`,
    "primary_release_date.desc": t`Newest`,
    "primary_release_date.asc": t`Oldest`,
  };

  const languageNames: Record<string, string> = {
    en: t`English`,
    es: t`Spanish`,
    fr: t`French`,
    de: t`German`,
    ja: t`Japanese`,
    ko: t`Korean`,
    zh: t`Chinese`,
    hi: t`Hindi`,
    it: t`Italian`,
    pt: t`Portuguese`,
  };

  function handleDecadeChange(value: string | null) {
    if (!value) {
      setYearMin(undefined);
      setYearMax(undefined);
      return;
    }
    const preset = DECADE_PRESETS.find((d) => String(d.min) === value);
    if (preset) {
      setYearMin(preset.min);
      setYearMax(preset.max);
    }
  }

  function handleRatingChange(value: string | null) {
    if (!value) {
      setRatingMin(undefined);
      return;
    }
    setRatingMin(Number(value));
  }

  function handleSortChange(value: string | null) {
    setSortBy((value || undefined) as DiscoverSortBy | undefined);
  }

  function handleLanguageChange(value: string | null) {
    setLanguage(value || undefined);
  }

  function handleProviderChange(value: string | null) {
    if (!value) {
      setProviderId(undefined);
      return;
    }
    setProviderId(Number(value));
  }

  function handleGenreChange(value: string | null) {
    if (!value) {
      setGenreId(undefined);
      return;
    }
    setGenreId(Number(value));
  }

  return (
    <FeedSection title={t`Discover`} icon={<IconSearch className="text-primary size-5" />}>
      <div className="flex flex-wrap gap-2">
        {/* Type toggle: Movie | TV */}
        <ToggleGroup
          value={[type]}
          onValueChange={(values) => {
            const next = values.find((v) => v !== type);
            if (next === "movie" || next === "tv") {
              setType(next);
              setGenreId(undefined);
              setProviderId(undefined);
            }
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="movie">{t`Movie`}</ToggleGroupItem>
          <ToggleGroupItem value="tv">{t`TV`}</ToggleGroupItem>
        </ToggleGroup>

        {/* Genre select */}
        <Select
          value={genreId != null ? String(genreId) : ""}
          onValueChange={handleGenreChange}
          modal={false}
          aria-label={t`Genre`}
        >
          <SelectTrigger size="sm">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Genre`;
                const genre = genres.find((g) => String(g.id) === value);
                return genre?.name ?? t`Genre`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="p-1">
            <SelectItem value="">{t`All genres`}</SelectItem>
            {genres.map((genre) => (
              <SelectItem key={genre.id} value={String(genre.id)}>
                {genre.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year select (decade presets) */}
        <Select
          value={yearMin != null ? String(yearMin) : ""}
          onValueChange={handleDecadeChange}
          modal={false}
          aria-label={t`Decade`}
        >
          <SelectTrigger size="sm">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Year`;
                const preset = DECADE_PRESETS.find((d) => String(d.min) === value);
                if (preset?.min === 1900) return t`Pre-1970`;
                return preset?.label ?? t`Year`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="p-1">
            <SelectItem value="">{t`Any year`}</SelectItem>
            {DECADE_PRESETS.map((d) => (
              <SelectItem key={d.min} value={String(d.min)}>
                {d.min === 1900 ? t`Pre-1970` : d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Rating select (minimum TMDB rating) */}
        <Select
          value={ratingMin != null ? String(ratingMin) : ""}
          onValueChange={handleRatingChange}
          modal={false}
          aria-label={t`Rating`}
        >
          <SelectTrigger size="sm">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Rating`;
                return `${value}+`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="p-1">
            <SelectItem value="">{t`Any rating`}</SelectItem>
            {RATING_PRESETS.map((r) => (
              <SelectItem key={r.value} value={String(r.value)}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort select */}
        <Select
          value={sortBy ?? ""}
          onValueChange={handleSortChange}
          modal={false}
          aria-label={t`Sort`}
        >
          <SelectTrigger size="sm">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Sort`;
                return sortLabels[value] ?? t`Sort`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="p-1">
            <SelectItem value="">{t`Default`}</SelectItem>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {sortLabels[s.value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language select */}
        <Select
          value={language ?? ""}
          onValueChange={handleLanguageChange}
          modal={false}
          aria-label={t`Language`}
        >
          <SelectTrigger size="sm">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Language`;
                return languageNames[value] ?? t`Language`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="p-1">
            <SelectItem value="">{t`Any language`}</SelectItem>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {languageNames[lang.code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Provider select */}
        <Select
          value={providerId != null ? String(providerId) : ""}
          onValueChange={handleProviderChange}
          modal={false}
          aria-label={t`Provider`}
        >
          <SelectTrigger size="sm">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Provider`;
                const provider = providers.find((p) => String(p.id) === value);
                return provider?.name ?? t`Provider`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="p-1">
            <SelectItem value="">{t`All providers`}</SelectItem>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={String(provider.id)}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isPending ? (
        <div className="flex items-center justify-center py-12">
          <IconLoader className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t`No titles found. Try adjusting your filters.`}
        </p>
      ) : (
        <>
          <TitleGrid items={items} />
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-4">
              <IconLoader className="text-muted-foreground size-5 animate-spin" />
            </div>
          )}
        </>
      )}
    </FeedSection>
  );
}
