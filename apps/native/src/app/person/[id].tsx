import { Trans, useLingui } from "@lingui/react/macro";
import { useHeaderHeight } from "@react-navigation/elements";
import { FlashList } from "@shopify/flash-list";
import {
  IconAlertTriangle,
  IconCalendar,
  IconMapPin,
  IconMovie,
  IconUser,
} from "@tabler/icons-react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { ModalLayout } from "@/components/navigation/modal-layout";
import { ExpandableText } from "@/components/ui/expandable-text";
import { Image } from "@/components/ui/image";
import { PosterCard } from "@/components/ui/poster-card";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useTitleActions } from "@/hooks/use-title-actions";
import { orpc } from "@/lib/orpc";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import { formatDate } from "@sofa/i18n/format";

const FILMOGRAPHY_GAP = 12;
const FILMOGRAPHY_PADDING = 16;
const FILMOGRAPHY_GUTTER = FILMOGRAPHY_GAP / 2;

function calculateAge(birthday: string, deathday?: string | null): number {
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function PersonDetailScreen() {
  const { t } = useLingui();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { back } = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const useAutomaticInsets = process.env.EXPO_OS === "ios";
  const filmographyColumns = screenWidth >= 900 ? 4 : screenWidth >= 600 ? 3 : 2;
  const columnWidth = Math.floor(
    (screenWidth - FILMOGRAPHY_PADDING * 2 - FILMOGRAPHY_GAP * (filmographyColumns - 1)) /
      filmographyColumns,
  );

  const mutedForeground = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;

  const { quickAdd } = useTitleActions();
  const handleQuickAdd = useCallback(
    (titleId: string) => quickAdd.mutate({ id: titleId }),
    [quickAdd],
  );
  const addingKey = quickAdd.isPending ? (quickAdd.variables?.id ?? null) : null;

  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      orpc.people.detail.infiniteOptions({
        input: (pageParam: number) => ({ id, page: pageParam, limit: 20 }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        maxPages: 10,
      }),
    );

  const person = data?.pages[0]?.person;
  const filmography = useMemo(() => data?.pages.flatMap((p) => p.filmography) ?? [], [data?.pages]);
  const userStatuses = useMemo(
    () =>
      Object.assign({}, ...(data?.pages.map((p) => p.userStatuses) ?? [])) as Record<
        string,
        "in_watchlist" | "watching" | "caught_up" | "completed"
      >,
    [data?.pages],
  );

  const personName = person?.name;
  const personProfilePath = person?.profilePath ?? null;
  const personDepartment = person?.knownForDepartment ?? null;

  useEffect(() => {
    if (personName) {
      addRecentlyViewed({
        id,
        type: "person",
        title: personName,
        imagePath: personProfilePath,
        subtitle: personDepartment,
      });
    }
  }, [id, personName, personProfilePath, personDepartment]);

  const renderFilmographyItem = useCallback(
    ({ item: credit }: { item: (typeof filmography)[number] }) => (
      <View
        style={{
          paddingBottom: FILMOGRAPHY_GAP,
          paddingHorizontal: FILMOGRAPHY_GUTTER,
        }}
      >
        <PosterCard
          id={credit.titleId}
          title={credit.title}
          type={credit.type}
          posterPath={credit.posterPath}
          posterThumbHash={credit.posterThumbHash}
          releaseDate={credit.releaseDate ?? credit.firstAirDate}
          voteAverage={credit.voteAverage}
          userStatus={userStatuses[credit.titleId] ?? null}
          width={columnWidth}
          onQuickAdd={handleQuickAdd}
          isAdding={addingKey === credit.titleId}
        />
      </View>
    ),
    [columnWidth, userStatuses, handleQuickAdd, addingKey],
  );

  const listHeader = useMemo(() => {
    if (!person) return null;

    const departmentLabels: Record<string, string> = {
      Acting: t`Actor`,
      Directing: t`Director`,
      Writing: t`Writer`,
      Production: t`Producer`,
      Editing: t`Editor`,
    };

    return (
      <>
        {/* Profile hero */}
        <Animated.View
          entering={FadeIn.duration(400)}
          className="items-center"
          style={{
            paddingTop: useAutomaticInsets ? 16 : insets.top + 56,
            paddingBottom: 24,
          }}
        >
          <View className="bg-secondary size-[120px] overflow-hidden rounded-full">
            {person.profilePath && (
              <Image
                source={{ uri: person.profilePath }}
                thumbHash={person.profileThumbHash}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            )}
          </View>

          <Text className="font-display text-foreground mt-4 text-center text-3xl">
            {person.name}
          </Text>

          {person.knownForDepartment ? (
            <View className="bg-secondary mt-2 rounded-full px-3 py-1">
              <Text className="text-muted-foreground text-xs tracking-wider uppercase">
                {departmentLabels[person.knownForDepartment] ?? person.knownForDepartment}
              </Text>
            </View>
          ) : null}

          {person.birthday || person.placeOfBirth ? (
            <View className="mt-3 items-center gap-1.5">
              {person.birthday ? (
                <View className="flex-row items-center gap-1.5">
                  <ScaledIcon icon={IconCalendar} size={14} color={primaryColor} />
                  <Text selectable className="text-muted-foreground text-sm">
                    {formatDate(person.birthday)}
                    <Text className="text-muted-foreground/60 text-sm">
                      {(() => {
                        const age = calculateAge(person.birthday, person.deathday);
                        return person.deathday ? ` (${t`died at ${age}`})` : ` (${t`age ${age}`})`;
                      })()}
                    </Text>
                  </Text>
                </View>
              ) : null}
              {person.placeOfBirth ? (
                <View className="flex-row items-center gap-1.5">
                  <ScaledIcon icon={IconMapPin} size={14} color={primaryColor} />
                  <Text selectable className="text-muted-foreground text-sm">
                    {person.placeOfBirth}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </Animated.View>

        {/* Biography */}
        {person.biography ? (
          <Animated.View entering={FadeInDown.duration(300).delay(100)}>
            <View className="mb-6 px-4">
              <ExpandableText text={person.biography} maxLines={4} />
            </View>
          </Animated.View>
        ) : null}

        {/* Filmography section header */}
        {filmography.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(200)} className="px-4">
            <SectionHeader title={t`Filmography`} icon={IconMovie} />
          </Animated.View>
        )}
      </>
    );
  }, [person, filmography.length, insets.top, useAutomaticInsets, primaryColor, t]);

  if (isPending) {
    return (
      <ModalLayout>
        <View className="flex-1 items-center" style={{ paddingTop: headerHeight + 24 }}>
          {/* Profile photo skeleton */}
          <Skeleton width={120} height={120} borderRadius={60} />
          {/* Name skeleton */}
          <Skeleton width={180} height={28} borderRadius={6} style={{ marginTop: 16 }} />
          {/* Department badge skeleton */}
          <Skeleton width={80} height={24} borderRadius={12} style={{ marginTop: 8 }} />
          {/* Bio skeleton */}
          <View className="mt-6 gap-2 self-stretch px-4">
            <Skeleton width="100%" height={14} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="60%" height={14} />
          </View>
        </View>
      </ModalLayout>
    );
  }

  if (isError && !data) {
    return (
      <ModalLayout>
        <View className="flex-1 items-center justify-center" style={{ paddingTop: insets.top }}>
          <Animated.View entering={FadeIn.duration(400)} className="items-center">
            <IconAlertTriangle size={48} color={mutedForeground} />
            <Text className="font-display text-foreground mt-3 text-xl">
              <Trans>Something went wrong</Trans>
            </Text>
            <Text className="text-muted-foreground mt-1 text-center text-sm">
              <Trans>Could not load person details</Trans>
            </Text>
            <Pressable onPress={() => back()} className="mt-4">
              <Text className="text-primary">
                <Trans>Go back</Trans>
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </ModalLayout>
    );
  }

  if (!person) {
    return (
      <ModalLayout>
        <View className="flex-1 items-center justify-center" style={{ paddingTop: insets.top }}>
          <Animated.View entering={FadeIn.duration(400)} className="items-center">
            <IconUser size={48} color={mutedForeground} />
            <Text className="font-display text-foreground mt-3 text-xl">
              <Trans>Person not found</Trans>
            </Text>
            <Pressable onPress={() => back()} className="mt-4">
              <Text className="text-primary">
                <Trans>Go back</Trans>
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </ModalLayout>
    );
  }

  return (
    <ModalLayout>
      <FlashList
        data={filmography}
        keyExtractor={(item) => item.titleId}
        renderItem={renderFilmographyItem}
        numColumns={filmographyColumns}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior={useAutomaticInsets ? "automatic" : "never"}
        contentContainerStyle={{
          paddingBottom: useAutomaticInsets ? 32 : insets.bottom + 32,
          paddingHorizontal: FILMOGRAPHY_PADDING - FILMOGRAPHY_GUTTER,
        }}
        ListHeaderComponent={listHeader}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-4">
              <Spinner />
            </View>
          ) : null
        }
      />
    </ModalLayout>
  );
}
