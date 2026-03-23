import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    availableToStream?: boolean;
  };
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
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

export function LibraryFilters({ filters, onFilterChange, onClearAll }: LibraryFiltersProps) {
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

  const ratingOptions = useMemo(
    () => [
      { value: "", label: t`Any` },
      { value: "1", label: "1\u2605" },
      { value: "2", label: "2\u2605" },
      { value: "3", label: "3\u2605" },
      { value: "4", label: "4\u2605" },
      { value: "5", label: "5\u2605" },
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

  const activeDecade = DECADES.find(
    (d) => filters.yearMin === d.yearMin && filters.yearMax === d.yearMax,
  );

  const isOlderActive = filters.yearMax === 1979 && filters.yearMin === undefined;

  function selectDecade(decade: (typeof DECADES)[number]) {
    if (activeDecade === decade) {
      onFilterChange("yearMin", undefined);
      onFilterChange("yearMax", undefined);
    } else {
      onFilterChange("yearMin", decade.yearMin);
      onFilterChange("yearMax", decade.yearMax);
    }
  }

  function selectOlder() {
    if (isOlderActive) {
      onFilterChange("yearMin", undefined);
      onFilterChange("yearMax", undefined);
    } else {
      onFilterChange("yearMin", undefined);
      onFilterChange("yearMax", 1979);
    }
  }

  function handleCustomYear(key: "yearMin" | "yearMax", raw: string) {
    const num = raw === "" ? undefined : Number(raw);
    onFilterChange(key, num);
  }

  const hasCustomYear =
    !activeDecade &&
    !isOlderActive &&
    (filters.yearMin !== undefined || filters.yearMax !== undefined);

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t`Status`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <Button
              key={s.value}
              variant={(filters.statuses ?? []).includes(s.value) ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => toggleStatus(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t`Type`}
        </p>
        <div className="flex flex-wrap gap-1.5">
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
        </div>
      </div>

      {/* Genre */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t`Genre`}
        </p>
        <Select
          value={filters.genreId !== undefined ? String(filters.genreId) : ""}
          onValueChange={(v) => onFilterChange("genreId", v === "" ? undefined : Number(v))}
          modal={false}
          aria-label={t`Genre`}
        >
          <SelectTrigger size="sm">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`All genres`;
                const genre = genreData?.genres.find((g) => String(g.id) === value);
                return genre?.name ?? t`All genres`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="p-1">
            <SelectItem value="">{t`All genres`}</SelectItem>
            {genreData?.genres.map((genre) => (
              <SelectItem key={genre.id} value={String(genre.id)}>
                {genre.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rating */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t`Rating`}
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={filters.ratingMin !== undefined ? String(filters.ratingMin) : ""}
            onValueChange={(v) => onFilterChange("ratingMin", v === "" ? undefined : Number(v))}
            modal={false}
            aria-label={t`Minimum rating`}
          >
            <SelectTrigger size="sm">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return t`Min`;
                  return `${value}\u2605`;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="p-1">
              {ratingOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-xs">&ndash;</span>
          <Select
            value={filters.ratingMax !== undefined ? String(filters.ratingMax) : ""}
            onValueChange={(v) => onFilterChange("ratingMax", v === "" ? undefined : Number(v))}
            modal={false}
            aria-label={t`Maximum rating`}
          >
            <SelectTrigger size="sm">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return t`Max`;
                  return `${value}\u2605`;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="p-1">
              {ratingOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t`Year`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DECADES.map((decade) => (
            <Button
              key={decade.label}
              variant={activeDecade === decade ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => selectDecade(decade)}
            >
              {decade.label}
            </Button>
          ))}
          <Button
            variant={isOlderActive ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={selectOlder}
          >
            {t`Older`}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={t`From`}
            value={hasCustomYear && filters.yearMin !== undefined ? filters.yearMin : ""}
            onChange={(e) => handleCustomYear("yearMin", e.target.value)}
            className="w-20"
            aria-label={t`Year from`}
          />
          <span className="text-muted-foreground text-xs">&ndash;</span>
          <Input
            type="number"
            placeholder={t`To`}
            value={hasCustomYear && filters.yearMax !== undefined ? filters.yearMax : ""}
            onChange={(e) => handleCustomYear("yearMax", e.target.value)}
            className="w-20"
            aria-label={t`Year to`}
          />
        </div>
      </div>

      {/* Content Rating */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t`Content Rating`}
        </p>
        <Select
          value={filters.contentRating ?? ""}
          onValueChange={(v) => onFilterChange("contentRating", v === "" ? undefined : v)}
          modal={false}
          aria-label={t`Content rating`}
        >
          <SelectTrigger size="sm">
            <SelectValue>{(value: string | null) => (value ? value : t`All`)}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="p-1">
            <SelectItem value="">{t`All`}</SelectItem>
            {CONTENT_RATINGS.map((rating) => (
              <SelectItem key={rating} value={rating}>
                {rating}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Available to Stream */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t`Streaming`}
        </p>
        <div className="flex items-center gap-2">
          <Switch
            checked={filters.availableToStream ?? false}
            onCheckedChange={(checked) => onFilterChange("availableToStream", checked || undefined)}
            aria-label={t`Available to stream`}
          />
          <span className="text-xs">{t`Available to stream`}</span>
        </div>
      </div>

      {/* Clear all */}
      <div className="flex justify-end">
        <Button variant="link" size="sm" onClick={onClearAll}>
          {t`Clear all`}
        </Button>
      </div>
    </div>
  );
}
