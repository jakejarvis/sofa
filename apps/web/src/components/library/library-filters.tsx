import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { orpc } from "@/lib/orpc/client";

export interface LibraryFiltersProps {
  filters: {
    statuses?: string[];
    type?: string;
    genreId?: number;
    ratingMin?: number;
    ratingMax?: number;
    yearMin?: number;
    yearMax?: number;
    contentRating?: string;
    onMyServices?: boolean;
  };
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
  activeFilterCount: number;
}

const DECADES = [
  { label: "2020s", yearMin: 2020, yearMax: 2029 },
  { label: "2010s", yearMin: 2010, yearMax: 2019 },
  { label: "2000s", yearMin: 2000, yearMax: 2009 },
  { label: "90s", yearMin: 1990, yearMax: 1999 },
  { label: "80s", yearMin: 1980, yearMax: 1989 },
] as const;

const CONTENT_RATINGS = [
  "G",
  "PG",
  "PG-13",
  "R",
  "NC-17",
  "TV-Y",
  "TV-Y7",
  "TV-G",
  "TV-PG",
  "TV-14",
  "TV-MA",
];

function Divider() {
  return <div className="bg-border/30 mx-1 hidden h-5 w-px sm:block" />;
}

export function LibraryFilters({
  filters,
  onFilterChange,
  onClearAll,
  activeFilterCount,
}: LibraryFiltersProps) {
  const { t } = useLingui();
  const { data: genreData } = useQuery(orpc.library.genres.queryOptions());

  const statuses = useMemo(
    () => [
      { value: "in_watchlist", label: t`Watchlist` },
      { value: "watching", label: t`Watching` },
      { value: "caught_up", label: t`Caught Up` },
      { value: "completed", label: t`Completed` },
    ],
    [t],
  );

  const types = useMemo(
    () => [
      { value: undefined, label: t`All` },
      { value: "movie", label: t`Movie` },
      { value: "tv", label: t`TV` },
    ],
    [t],
  );

  function toggleStatus(status: string) {
    const current = filters.statuses ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFilterChange("statuses", next.length > 0 ? next : undefined);
  }

  // Status dropdown label
  const statusLabel = useMemo(() => {
    const selected = filters.statuses ?? [];
    if (selected.length === 0) return t`Status`;
    if (selected.length === 1) {
      return statuses.find((s) => s.value === selected[0])?.label ?? t`Status`;
    }
    return plural(selected.length, { one: "# status", other: "# statuses" });
  }, [filters.statuses, statuses, t]);

  // Year dropdown value
  const activeDecade = DECADES.find(
    (d) => filters.yearMin === d.yearMin && filters.yearMax === d.yearMax,
  );
  const isOlderActive = filters.yearMax === 1979 && filters.yearMin === undefined;
  const yearValue = activeDecade ? String(activeDecade.yearMin) : isOlderActive ? "older" : "";

  function handleYearChange(value: string | null) {
    if (!value) {
      onFilterChange("yearMin", undefined);
      onFilterChange("yearMax", undefined);
      return;
    }
    if (value === "older") {
      onFilterChange("yearMin", undefined);
      onFilterChange("yearMax", 1979);
      return;
    }
    const decade = DECADES.find((d) => String(d.yearMin) === value);
    if (decade) {
      onFilterChange("yearMin", decade.yearMin);
      onFilterChange("yearMax", decade.yearMax);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      {/* Type pills */}
      {types.map((typ) => (
        <Button
          key={typ.value ?? "all"}
          variant={filters.type === typ.value ? "default" : "outline"}
          size="sm"
          className="rounded-full"
          onClick={() => onFilterChange("type", typ.value)}
        >
          {typ.label}
        </Button>
      ))}

      <Divider />

      {/* Status — multi-select dropdown */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              data-active={(filters.statuses ?? []).length > 0 ? "" : undefined}
              className="data-[active]:border-primary/40 data-[active]:text-foreground"
            >
              {statusLabel}
              <IconChevronDown aria-hidden={true} className="text-muted-foreground size-3" />
            </Button>
          }
        />
        <PopoverContent className="w-44 p-1">
          {statuses.map((s) => {
            const isActive = (filters.statuses ?? []).includes(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleStatus(s.value)}
                className="hover:bg-muted/50 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm"
              >
                <div
                  className={`flex size-3.5 items-center justify-center rounded border transition-colors ${
                    isActive ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {isActive && <IconCheck className="size-2.5" strokeWidth={3} />}
                </div>
                {s.label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Genre */}
      <Select
        value={filters.genreId !== undefined ? String(filters.genreId) : ""}
        onValueChange={(v) => onFilterChange("genreId", v === "" ? undefined : Number(v))}
        modal={false}
        aria-label={t`Genre`}
      >
        <SelectTrigger
          size="sm"
          data-active={filters.genreId != null ? "" : undefined}
          className="data-[active]:border-primary/40 data-[active]:text-foreground"
        >
          <SelectValue>
            {(value: string | null) => {
              if (!value) return t`Genre`;
              const genre = genreData?.genres.find((g) => String(g.id) === value);
              return genre?.name ?? t`Genre`;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="p-1">
          <SelectItem value="">{t`All genres`}</SelectItem>
          {genreData?.genres.map((genre) => (
            <SelectItem key={genre.id} value={String(genre.id)}>
              {genre.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Rating */}
      <Select
        value={filters.ratingMin !== undefined ? String(filters.ratingMin) : ""}
        onValueChange={(v) => onFilterChange("ratingMin", v === "" ? undefined : Number(v))}
        modal={false}
        aria-label={t`Rating`}
      >
        <SelectTrigger
          size="sm"
          data-active={filters.ratingMin != null ? "" : undefined}
          className="data-[active]:border-primary/40 data-[active]:text-foreground"
        >
          <SelectValue>
            {(value: string | null) => {
              if (!value) return t`Rating`;
              return `${value}\u2605+`;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="p-1">
          <SelectItem value="">{t`Any`}</SelectItem>
          <SelectItem value="1">1★+</SelectItem>
          <SelectItem value="2">2★+</SelectItem>
          <SelectItem value="3">3★+</SelectItem>
          <SelectItem value="4">4★+</SelectItem>
          <SelectItem value="5">5★</SelectItem>
        </SelectContent>
      </Select>

      {/* Year */}
      <Select value={yearValue} onValueChange={handleYearChange} modal={false} aria-label={t`Year`}>
        <SelectTrigger
          size="sm"
          data-active={yearValue ? "" : undefined}
          className="data-[active]:border-primary/40 data-[active]:text-foreground"
        >
          <SelectValue>
            {(value: string | null) => {
              if (!value) return t`Year`;
              if (value === "older") return t`Pre-1980`;
              const decade = DECADES.find((d) => String(d.yearMin) === value);
              return decade?.label ?? t`Year`;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="p-1">
          <SelectItem value="">{t`Any year`}</SelectItem>
          {DECADES.map((d) => (
            <SelectItem key={d.yearMin} value={String(d.yearMin)}>
              {d.label}
            </SelectItem>
          ))}
          <SelectItem value="older">{t`70s and earlier`}</SelectItem>
        </SelectContent>
      </Select>

      {/* Content Rating */}
      <Select
        value={filters.contentRating ?? ""}
        onValueChange={(v) => onFilterChange("contentRating", v === "" ? undefined : v)}
        modal={false}
        aria-label={t`Content rating`}
      >
        <SelectTrigger
          size="sm"
          data-active={filters.contentRating ? "" : undefined}
          className="data-[active]:border-primary/40 data-[active]:text-foreground"
        >
          <SelectValue>{(value: string | null) => (value ? value : t`Age`)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="p-1">
          <SelectItem value="">{t`All`}</SelectItem>
          {CONTENT_RATINGS.map((rating) => (
            <SelectItem key={rating} value={rating}>
              {rating}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Divider />

      {/* On my services */}
      <label className="flex cursor-pointer items-center gap-1.5">
        <Switch
          size="sm"
          checked={filters.onMyServices ?? false}
          onCheckedChange={(checked) => onFilterChange("onMyServices", checked || undefined)}
          aria-label={t`On my services`}
        />
        <span className="text-muted-foreground text-[11px]">{t`On my services`}</span>
      </label>

      {/* Clear */}
      {activeFilterCount > 0 && (
        <>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClearAll}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            {t`Clear`}
          </button>
        </>
      )}
    </div>
  );
}
