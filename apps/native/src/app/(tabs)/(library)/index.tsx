import { useLingui } from "@lingui/react/macro";
import { FlashList } from "@shopify/flash-list";
import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconBooks,
  IconCalendarEvent,
  IconCategory,
  IconChecklist,
  IconShieldCheck,
  IconStarFilled,
} from "@tabler/icons-react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { EmptyState } from "@/components/ui/empty-state";
import { PosterCard } from "@/components/ui/poster-card";
import { SelectModal } from "@/components/ui/select-modal";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useTitleActions } from "@/hooks/use-title-actions";
import {
  libraryActiveFilterCountAtom,
  librarySortByAtom,
  librarySortDirectionAtom,
} from "@/lib/library-atoms";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import * as Haptics from "@/utils/haptics";

// ─── Grid constants ─────────────────────────────────────────────────

const NUM_COLUMNS = 3;
const EDGE_PADDING = 16;
const GAP = 8;

// ─── Inline filter chip ─────────────────────────────────────────────

function Chip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      className={`rounded-full px-3 py-1.5 ${isActive ? "bg-primary" : "bg-secondary"}`}
    >
      <Text
        className={`font-sans text-xs font-medium ${isActive ? "text-primary-foreground" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DropdownChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${isActive ? "bg-primary/15 border-primary/40 border" : "bg-secondary"}`}
    >
      <Text
        className={`font-sans text-xs font-medium ${isActive ? "text-primary" : "text-foreground"}`}
      >
        {label}
      </Text>
      <Text className={`text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
        {"\u25BE"}
      </Text>
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const { t } = useLingui();
  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = Math.floor(
    (screenWidth - 2 * EDGE_PADDING - (NUM_COLUMNS - 1) * GAP) / NUM_COLUMNS,
  );

  // Filter state
  const [type, setType] = useState<"movie" | "tv" | undefined>(undefined);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [genreId, setGenreId] = useState<number | undefined>(undefined);
  const [ratingMin, setRatingMin] = useState<number | undefined>(undefined);
  const [yearMin, setYearMin] = useState<number | undefined>(undefined);
  const [yearMax, setYearMax] = useState<number | undefined>(undefined);
  const [contentRating, setContentRating] = useState<string | undefined>(undefined);

  // Sort state from atoms (controlled by layout header)
  const [sortBy] = useAtom(librarySortByAtom);
  const [sortDirection] = useAtom(librarySortDirectionAtom);

  // Modal state for dropdowns
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [contentRatingModalOpen, setContentRatingModalOpen] = useState(false);

  // Sync active filter count to atom for header badge
  const setActiveFilterCount = useSetAtom(libraryActiveFilterCountAtom);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statuses.length > 0) count++;
    if (type) count++;
    if (genreId !== undefined) count++;
    if (ratingMin !== undefined) count++;
    if (yearMin !== undefined || yearMax !== undefined) count++;
    if (contentRating) count++;
    return count;
  }, [statuses, type, genreId, ratingMin, yearMin, yearMax, contentRating]);

  useEffect(() => {
    setActiveFilterCount(activeFilterCount);
  }, [activeFilterCount, setActiveFilterCount]);

  // Genre data for filter
  const { data: genreData } = useQuery(orpc.library.genres.queryOptions());

  const genreOptions = useMemo(
    () => [
      { value: "", label: t`All genres` },
      ...(genreData?.genres.map((g) => ({ value: String(g.id), label: g.name })) ?? []),
    ],
    [genreData, t],
  );

  const statusOptions = useMemo(
    () => [
      { value: "in_watchlist", label: t`Watchlist` },
      { value: "watching", label: t`Watching` },
      { value: "caught_up", label: t`Caught Up` },
      { value: "completed", label: t`Completed` },
    ],
    [t],
  );

  const ratingOptions = useMemo(
    () => [
      { value: "", label: t`Any` },
      { value: "1", label: t`1★+` },
      { value: "2", label: t`2★+` },
      { value: "3", label: t`3★+` },
      { value: "4", label: t`4★+` },
      { value: "5", label: t`5★` },
    ],
    [t],
  );

  const yearOptions = useMemo(
    () => [
      { value: "", label: t`Any year` },
      { value: "2020", label: t`2020s` },
      { value: "2010", label: t`2010s` },
      { value: "2000", label: t`2000s` },
      { value: "1990", label: t`1990s` },
      { value: "1980", label: t`1980s` },
      { value: "older", label: t`Pre-1980` },
    ],
    [t],
  );

  const contentRatingOptions = useMemo(
    () => [
      { value: "", label: t`All` },
      ...["G", "PG", "PG-13", "R", "NC-17", "TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14", "TV-MA"].map(
        (r) => ({ value: r, label: r }),
      ),
    ],
    [t],
  );

  // Derived labels for dropdown chips
  const statusLabel = useMemo(() => {
    if (statuses.length === 0) return t`Status`;
    if (statuses.length === 1)
      return statusOptions.find((s) => s.value === statuses[0])?.label ?? t`Status`;
    return `${statuses.length} statuses`;
  }, [statuses, statusOptions, t]);

  const genreLabel = genreData?.genres.find((g) => g.id === genreId)?.name ?? t`Genre`;
  const ratingLabel = ratingMin ? `${ratingMin}\u2605+` : t`Rating`;
  const yearLabel = useMemo(() => {
    if (yearMin && yearMax) {
      const decade = yearOptions.find((y) => y.value === String(yearMin));
      return decade?.label ?? t`Year`;
    }
    if (yearMax === 1979) return t`Pre-1980`;
    return t`Year`;
  }, [yearMin, yearMax, yearOptions, t]);
  const contentRatingLabel = contentRating ?? t`Age`;

  // Query
  const libraryQuery = useInfiniteQuery({
    ...orpc.library.list.infiniteOptions({
      input: (pageParam: number) => ({
        statuses:
          statuses.length > 0
            ? (statuses as ("in_watchlist" | "watching" | "caught_up" | "completed")[])
            : undefined,
        type,
        genreId,
        ratingMin,
        yearMin,
        yearMax,
        contentRating,
        sortBy,
        sortDirection,
        page: pageParam,
        limit: 30,
      }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      maxPages: 10,
    }),
    enabled: true,
  });

  const { updateStatus } = useTitleActions();
  const handleQuickAdd = useCallback(
    (id: string) => updateStatus.mutate({ id, status: "watchlist" }),
    [updateStatus],
  );
  const addingId = updateStatus.isPending ? (updateStatus.variables?.id ?? null) : null;

  const allItems = useMemo(
    () => libraryQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [libraryQuery.data?.pages],
  );

  const isRefreshing = libraryQuery.isRefetching && !libraryQuery.isFetchingNextPage;
  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orpc.library.key() });
  }, []);

  type LibraryItem = (typeof allItems)[number];

  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) => (
      <View style={{ flex: 1, paddingHorizontal: GAP / 2, paddingBottom: GAP }}>
        <PosterCard
          id={item.id}
          title={item.title}
          type={item.type as "movie" | "tv"}
          posterPath={item.posterPath}
          posterThumbHash={item.posterThumbHash}
          releaseDate={item.releaseDate ?? item.firstAirDate}
          voteAverage={item.voteAverage}
          userStatus={item.userStatus}
          width={itemWidth}
          onQuickAdd={handleQuickAdd}
          isAdding={addingId === item.id}
        />
      </View>
    ),
    [handleQuickAdd, addingId, itemWidth],
  );

  const keyExtractor = useCallback((item: LibraryItem) => item.id, []);

  function clearAll() {
    setType(undefined);
    setStatuses([]);
    setGenreId(undefined);
    setRatingMin(undefined);
    setYearMin(undefined);
    setYearMax(undefined);
    setContentRating(undefined);
  }

  function handleYearSelect(value: string) {
    if (!value) {
      setYearMin(undefined);
      setYearMax(undefined);
    } else if (value === "older") {
      setYearMin(undefined);
      setYearMax(1979);
    } else {
      const min = Number(value);
      setYearMin(min);
      setYearMax(min + 9);
    }
  }

  // ─── Filter strip ───────────────────────────────────────────────

  const filterStrip = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingTop: 6, paddingBottom: 16 }}
    >
      {/* Type pills */}
      <Chip label={t`All`} isActive={!type} onPress={() => setType(undefined)} />
      <Chip
        label={t`Movies`}
        isActive={type === "movie"}
        onPress={() => setType(type === "movie" ? undefined : "movie")}
      />
      <Chip
        label={t`TV`}
        isActive={type === "tv"}
        onPress={() => setType(type === "tv" ? undefined : "tv")}
      />

      <View className="bg-border/30 mx-1 w-px self-stretch" />

      {/* Dropdown chips */}
      <DropdownChip
        label={statusLabel}
        isActive={statuses.length > 0}
        onPress={() => setStatusModalOpen(true)}
      />
      <DropdownChip
        label={genreLabel}
        isActive={genreId !== undefined}
        onPress={() => setGenreModalOpen(true)}
      />
      <DropdownChip
        label={ratingLabel}
        isActive={ratingMin !== undefined}
        onPress={() => setRatingModalOpen(true)}
      />
      <DropdownChip
        label={yearLabel}
        isActive={yearMin !== undefined || yearMax !== undefined}
        onPress={() => setYearModalOpen(true)}
      />
      <DropdownChip
        label={contentRatingLabel}
        isActive={!!contentRating}
        onPress={() => setContentRatingModalOpen(true)}
      />

      {activeFilterCount > 0 && (
        <Pressable onPress={clearAll} className="justify-center px-2">
          <Text className="text-muted-foreground text-xs">{t`Clear`}</Text>
        </Pressable>
      )}
    </ScrollView>
  );

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <View collapsable={false} className="bg-background flex-1">
      {libraryQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <Spinner colorClassName="accent-primary" />
        </View>
      ) : libraryQuery.isError ? (
        <EmptyState
          icon={IconAlertTriangle}
          title={t`Something went wrong`}
          description={t`Could not load your library`}
          actionLabel={t`Retry`}
          onAction={() => libraryQuery.refetch()}
        />
      ) : allItems.length === 0 ? (
        <Animated.View entering={FadeIn.duration(300)} className="flex-1">
          {filterStrip}
          {activeFilterCount > 0 ? (
            <EmptyState
              icon={IconAdjustmentsHorizontal}
              title={t`No matching titles`}
              description={t`Try adjusting your filters`}
              actionLabel={t`Clear filters`}
              onAction={clearAll}
            />
          ) : (
            <EmptyState
              icon={IconBooks}
              title={t`Your library is empty`}
              description={t`Start tracking movies and shows`}
            />
          )}
        </Animated.View>
      ) : (
        <FlashList
          data={allItems}
          numColumns={NUM_COLUMNS}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={filterStrip}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: EDGE_PADDING - GAP / 2,
            paddingBottom: 16,
          }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          onEndReached={() => {
            if (libraryQuery.hasNextPage && !libraryQuery.isFetchingNextPage) {
              libraryQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            libraryQuery.isFetchingNextPage ? (
              <View className="items-center py-4">
                <Spinner />
              </View>
            ) : null
          }
        />
      )}

      {/* SelectModals for dropdown chips */}
      <SelectModal
        label={t`Status`}
        icon={IconChecklist}
        selection={statuses}
        options={statusOptions}
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        multiSelect
        clearLabel={statuses.length > 0 ? t`Clear` : undefined}
        onClear={() => setStatuses([])}
        onSelect={(value) =>
          setStatuses((prev) =>
            prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
          )
        }
      />
      <SelectModal
        label={t`Genre`}
        icon={IconCategory}
        selection={genreId !== undefined ? String(genreId) : ""}
        options={genreOptions}
        open={genreModalOpen}
        onOpenChange={setGenreModalOpen}
        clearLabel={genreId !== undefined ? t`Clear` : undefined}
        onClear={() => setGenreId(undefined)}
        onSelect={(value) => setGenreId(value ? Number(value) : undefined)}
      />
      <SelectModal
        label={t`Rating`}
        icon={IconStarFilled}
        selection={ratingMin !== undefined ? String(ratingMin) : ""}
        options={ratingOptions}
        open={ratingModalOpen}
        onOpenChange={setRatingModalOpen}
        clearLabel={ratingMin !== undefined ? t`Clear` : undefined}
        onClear={() => setRatingMin(undefined)}
        onSelect={(value) => setRatingMin(value ? Number(value) : undefined)}
      />
      <SelectModal
        label={t`Year`}
        icon={IconCalendarEvent}
        selection={yearMin ? String(yearMin) : yearMax === 1979 ? "older" : ""}
        options={yearOptions}
        open={yearModalOpen}
        onOpenChange={setYearModalOpen}
        clearLabel={yearMin !== undefined || yearMax !== undefined ? t`Clear` : undefined}
        onClear={() => {
          setYearMin(undefined);
          setYearMax(undefined);
        }}
        onSelect={handleYearSelect}
      />
      <SelectModal
        label={t`Content Rating`}
        icon={IconShieldCheck}
        selection={contentRating ?? ""}
        options={contentRatingOptions}
        open={contentRatingModalOpen}
        onOpenChange={setContentRatingModalOpen}
        clearLabel={contentRating ? t`Clear` : undefined}
        onClear={() => setContentRating(undefined)}
        onSelect={(value) => setContentRating(value || undefined)}
      />
    </View>
  );
}
