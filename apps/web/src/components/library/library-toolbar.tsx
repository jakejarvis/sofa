import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconFilter, IconSearch, IconSortDescending } from "@tabler/icons-react";
import { useMemo } from "react";

import { LibraryFilters, type LibraryFiltersProps } from "@/components/library/library-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface LibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: LibraryFiltersProps["filters"];
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
  sortBy: string;
  sortDirection: string;
  onSortChange: (sortBy: string, sortDirection: string) => void;
  totalResults: number;
  activeFilterCount: number;
}

export function LibraryToolbar({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onClearAll,
  sortBy,
  sortDirection,
  onSortChange,
  totalResults,
  activeFilterCount,
}: LibraryToolbarProps) {
  const { t } = useLingui();

  const sortOptions = useMemo(
    () => [
      { label: t`Date Added`, sortBy: "added_at", direction: "desc" },
      { label: t`Title A-Z`, sortBy: "title", direction: "asc" },
      { label: t`Title Z-A`, sortBy: "title", direction: "desc" },
      { label: t`Release Date`, sortBy: "release_date", direction: "desc" },
      { label: t`User Rating`, sortBy: "user_rating", direction: "desc" },
      { label: t`TMDB Rating`, sortBy: "vote_average", direction: "desc" },
      { label: t`Popularity`, sortBy: "popularity", direction: "desc" },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 sm:max-w-xs">
        <IconSearch
          aria-hidden={true}
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t`Search library...`}
          className="pl-7"
          aria-label={t`Search library`}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">
          {plural(totalResults, { one: "# result", other: "# results" })}
        </span>

        {/* Filter popover */}
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm">
                <IconFilter aria-hidden={true} className="size-3.5" />
                {t`Filters`}
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-1 size-4 justify-center px-0">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-80">
            <LibraryFilters
              filters={filters}
              onFilterChange={onFilterChange}
              onClearAll={onClearAll}
            />
          </PopoverContent>
        </Popover>

        {/* Sort dropdown */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <IconSortDescending aria-hidden={true} className="size-3.5" />
                {t`Sort`}
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {sortOptions.map((option) => {
              const isActive = sortBy === option.sortBy && sortDirection === option.direction;
              return (
                <DropdownMenuItem
                  key={`${option.sortBy}-${option.direction}`}
                  className="cursor-pointer"
                  onClick={() => onSortChange(option.sortBy, option.direction)}
                >
                  <span className={isActive ? "text-primary font-medium" : ""}>{option.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
