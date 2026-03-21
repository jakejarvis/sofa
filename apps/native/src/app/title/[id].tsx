import { Trans, useLingui } from "@lingui/react/macro";
import { useHeaderHeight } from "@react-navigation/elements";
import { FlashList } from "@shopify/flash-list";
import {
  IconAlertTriangle,
  IconBrandAppstore,
  IconBrandGooglePlay,
  IconCheck,
  IconList,
  IconMovie,
  IconPlayerPlay,
  IconStarFilled,
  IconThumbUp,
  IconUsers,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import {
  HorizontalPosterRow,
  type PosterRowItem,
} from "@/components/dashboard/horizontal-poster-row";
import { ModalLayout } from "@/components/navigation/modal-layout";
import { CastCard } from "@/components/titles/cast-card";
import { ContinueWatchingBanner } from "@/components/titles/continue-watching-banner";
import { SeasonAccordion } from "@/components/titles/season-accordion";
import { StatusActionButton } from "@/components/titles/status-action-button";
import { ExpandableText } from "@/components/ui/expandable-text";
import {
  HorizontalListSeparator,
  horizontalListContentStyle,
  horizontalListStyle,
} from "@/components/ui/horizontal-list-spacing";
import { Image } from "@/components/ui/image";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Text } from "@/components/ui/text";
import { useTitleActions } from "@/hooks/use-title-actions";
import { useTitleTheme } from "@/hooks/use-title-theme";
import { getAppErrorCode } from "@/lib/error-messages";
import { orpc } from "@/lib/orpc";
import { addRecentlyViewed } from "@/lib/recently-viewed";

const titleGenresContentStyle = { paddingHorizontal: 16 };
const titleAvailabilityContentStyle = { gap: 8, paddingHorizontal: 16 };
const titleDetailStyles = StyleSheet.create({
  heroFill: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  trailerGlass: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  trailerFallback: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  posterImage: {
    width: "100%",
    height: "100%",
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
});

export default function TitleDetailScreen() {
  const { t } = useLingui();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { back } = useRouter();
  const useAutomaticInsets = process.env.EXPO_OS === "ios";

  const [titleAccent, mutedForeground, titleAccentForeground] = useCSSVariable([
    "--color-title-accent",
    "--color-muted-foreground",
    "--color-title-accent-foreground",
  ]) as [string, string, string];

  const detail = useQuery(orpc.titles.detail.queryOptions({ input: { id } }));
  const userInfo = useQuery(orpc.titles.userInfo.queryOptions({ input: { id } }));
  const recommendations = useQuery(orpc.titles.recommendations.queryOptions({ input: { id } }));

  const {
    updateStatus,
    updateRating,
    watchMovie,
    quickAdd: quickAddMutation,
  } = useTitleActions({
    toasts: {
      watchMovie: () => (title?.title ? `Marked "${title.title}" as watched` : "Marked as watched"),
    },
  });

  const title = detail.data?.title;
  const detailErrorCode = getAppErrorCode(detail.error);
  const palette = title?.colorPalette ?? null;
  useTitleTheme(palette);
  const providerIcon = process.env.EXPO_OS === "ios" ? IconBrandAppstore : IconBrandGooglePlay;

  const titleName = title?.title;
  const titleType = title?.type;
  const titlePosterPath = title?.posterPath ?? null;
  const titleYear = (title?.releaseDate ?? title?.firstAirDate)?.slice(0, 4) ?? null;

  useEffect(() => {
    if (titleName && titleType) {
      addRecentlyViewed({
        id,
        type: titleType,
        title: titleName,
        imagePath: titlePosterPath,
        subtitle: titleYear,
      });
    }
  }, [id, titleName, titleType, titlePosterPath, titleYear]);

  const seasons = detail.data?.seasons ?? [];
  const cast = detail.data?.cast ?? [];
  const availability = detail.data?.availability ?? [];
  const watchedEpisodeIds = useMemo(
    () => new Set(userInfo.data?.episodeWatches ?? []),
    [userInfo.data?.episodeWatches],
  );

  const recItems = useMemo<PosterRowItem[]>(
    () =>
      (recommendations.data?.recommendations ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        posterPath: item.posterPath,
        posterThumbHash: item.posterThumbHash,
        releaseDate: item.releaseDate,
        firstAirDate: item.firstAirDate,
        voteAverage: item.voteAverage,
        userStatus: item.id ? (recommendations.data?.userStatuses?.[item.id] ?? null) : null,
      })),
    [recommendations.data],
  );
  const renderCastItem = useCallback(
    ({ item }: { item: (typeof cast)[number] }) => <CastCard person={item} />,
    [],
  );

  const titleScrollContentStyle = useMemo(
    () => ({
      paddingBottom: useAutomaticInsets ? 32 : insets.bottom + 32,
    }),
    [useAutomaticInsets, insets.bottom],
  );
  const heroMarginStyle = useMemo(
    () => (useAutomaticInsets ? { marginTop: -headerHeight } : undefined),
    [useAutomaticInsets, headerHeight],
  );
  const darkMutedOverlayStyle = useMemo(
    () => (palette?.darkMuted ? { backgroundColor: palette.darkMuted, opacity: 0.2 } : undefined),
    [palette?.darkMuted],
  );
  const vibrantOverlayStyle = useMemo(
    () => (palette?.vibrant ? { backgroundColor: palette.vibrant, opacity: 0.06 } : undefined),
    [palette?.vibrant],
  );
  const posterShadowStyle = useMemo(
    () =>
      palette?.darkVibrant
        ? {
            boxShadow: `0 12px 28px -8px ${palette.darkVibrant}80`,
          }
        : undefined,
    [palette?.darkVibrant],
  );

  if (detail.isPending) {
    return (
      <ModalLayout>
        {/* Hero skeleton */}
        <Skeleton width="100%" height={300} borderRadius={0} />
        {/* Genre chips skeleton */}
        <View className="mt-3 flex-row gap-2 px-4">
          <Skeleton width={60} height={24} borderRadius={12} />
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={50} height={24} borderRadius={12} />
        </View>
        {/* Actions skeleton */}
        <View className="mt-4 flex-row items-center gap-3 px-4">
          <Skeleton width={110} height={36} borderRadius={8} />
          <Skeleton width={1} height={24} borderRadius={0} />
          <Skeleton width={120} height={22} borderRadius={4} />
        </View>
        {/* Overview skeleton */}
        <View className="mt-5 gap-2 px-4">
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="70%" height={14} />
        </View>
      </ModalLayout>
    );
  }

  if (detail.isError && detailErrorCode === "TITLE_NOT_FOUND") {
    return (
      <ModalLayout>
        <View className="flex-1 items-center justify-center px-6">
          <IconMovie size={48} color={mutedForeground} />
          <Text className="font-display text-foreground mt-3 text-xl">
            <Trans>Title not found</Trans>
          </Text>
          <Pressable onPress={() => back()} className="mt-4">
            <Text className="text-primary">
              <Trans>Go back</Trans>
            </Text>
          </Pressable>
        </View>
      </ModalLayout>
    );
  }

  if (detail.isError || !title) {
    return (
      <ModalLayout>
        <View className="flex-1 items-center justify-center px-6">
          <IconAlertTriangle size={48} color={mutedForeground} />
          <Text className="font-display text-foreground mt-3 text-xl">
            <Trans>Something went wrong</Trans>
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-sm">
            <Trans>Could not load title details</Trans>
          </Text>
          <View className="mt-4 flex-row items-center gap-4">
            <Pressable onPress={() => void detail.refetch()}>
              <Text className="text-primary">
                <Trans>Try again</Trans>
              </Text>
            </Pressable>
            <Pressable onPress={() => back()}>
              <Text className="text-primary">
                <Trans>Go back</Trans>
              </Text>
            </Pressable>
          </View>
        </View>
      </ModalLayout>
    );
  }

  const year = (title.releaseDate ?? title.firstAirDate)?.slice(0, 4);

  return (
    <ModalLayout>
      <ScrollView
        contentInsetAdjustmentBehavior={useAutomaticInsets ? "automatic" : "never"}
        contentContainerStyle={titleScrollContentStyle}
      >
        {/* Hero */}
        <View className="h-[300px]" style={heroMarginStyle}>
          {title.backdropPath && (
            <Image
              source={{ uri: title.backdropPath }}
              thumbHash={title.backdropThumbHash}
              style={titleDetailStyles.heroFill}
              contentFit="cover"
            />
          )}
          {/* Base darkening overlay */}
          <View style={titleDetailStyles.heroBaseOverlay} />
          {/* Colored tint from palette */}
          {palette?.darkMuted && (
            <View style={[titleDetailStyles.heroFill, darkMutedOverlayStyle]} />
          )}
          {palette?.vibrant && <View style={[titleDetailStyles.heroFill, vibrantOverlayStyle]} />}
          {/* Bottom fade to background */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.95)"]}
            locations={[0, 0.5, 1]}
            style={titleDetailStyles.heroGradient}
          />

          {title.trailerVideoKey && (
            <Pressable
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  `https://www.youtube.com/watch?v=${title.trailerVideoKey}`,
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`Play trailer for ${title.title}`}
              accessibilityHint="Opens the trailer in YouTube"
              className="absolute inset-0 items-center justify-center"
            >
              {isLiquidGlassAvailable() ? (
                <GlassView
                  glassEffectStyle="clear"
                  colorScheme="dark"
                  isInteractive={true}
                  style={titleDetailStyles.trailerGlass}
                >
                  <IconPlayerPlay size={28} color="white" fill="white" />
                </GlassView>
              ) : (
                <View
                  className="h-14 w-14 items-center justify-center rounded-full"
                  style={titleDetailStyles.trailerFallback}
                >
                  <IconPlayerPlay size={28} color="white" fill="white" />
                </View>
              )}
            </Pressable>
          )}

          <View className="absolute right-0 bottom-0 left-0 flex-row items-end p-4">
            {title.posterPath && (
              <Link.AppleZoomTarget>
                <View
                  className="mr-3 h-[150px] w-[100px] overflow-hidden rounded-lg"
                  style={[{ borderCurve: "continuous" }, posterShadowStyle]}
                >
                  <Image
                    source={{ uri: title.posterPath }}
                    thumbHash={title.posterThumbHash}
                    style={titleDetailStyles.posterImage}
                    contentFit="cover"
                  />
                </View>
              </Link.AppleZoomTarget>
            )}
            <View className="flex-1 pb-1">
              <Text className="font-display text-2xl text-white" numberOfLines={2}>
                {title.title}
              </Text>
              <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
                <View className="bg-title-accent rounded-full px-2 py-0.5">
                  <Text
                    maxFontSizeMultiplier={1.0}
                    className="text-title-accent-foreground font-sans text-xs font-medium"
                  >
                    {title.type === "movie" ? t`Movie` : t`TV`}
                  </Text>
                </View>
                {year ? <Text className="text-sm text-white/70">{year}</Text> : null}
                {title.contentRating ? (
                  <Text className="text-xs text-white/50">{title.contentRating}</Text>
                ) : null}
                {title.voteAverage != null && title.voteAverage > 0 && (
                  <View className="flex-row items-center gap-0.5">
                    <ScaledIcon icon={IconStarFilled} size={12} color={titleAccent} />
                    <Text className="text-title-accent text-xs">
                      {title.voteAverage.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Genres */}
        {title.genres && title.genres.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(100)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={titleGenresContentStyle}
            >
              {title.genres.map((genre: string) => (
                <View key={genre} className="bg-secondary mr-2 rounded-full px-2.5 py-1">
                  <Text className="text-muted-foreground text-xs">{genre}</Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)} className="mt-4 px-4">
          <View className="flex-row flex-wrap items-center gap-3">
            <StatusActionButton
              currentStatus={userInfo.data?.status ?? null}
              onStatusChange={(status) => {
                if (status === "in_watchlist") {
                  quickAddMutation.mutate({ id });
                } else {
                  updateStatus.mutate({ id, status: null });
                }
              }}
              isPending={
                updateStatus.isPending || quickAddMutation.isPending || watchMovie.isPending
              }
            />

            {title.type === "movie" && (
              <Pressable
                onPress={() => watchMovie.mutate({ id })}
                disabled={watchMovie.isPending}
                className="bg-title-accent flex-row items-center gap-1.5 rounded-lg px-4 py-2"
              >
                {watchMovie.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <ScaledIcon icon={IconCheck} size={16} color={titleAccentForeground} />
                    <Text className="text-title-accent-foreground font-sans text-sm font-medium">
                      <Trans>Mark Watched</Trans>
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            <View className="bg-border/50 h-6 w-px" />

            <StarRating
              rating={userInfo.data?.rating ?? 0}
              onRate={(stars) => updateRating.mutate({ id, stars })}
              accentColor={titleAccent}
            />
          </View>
        </Animated.View>

        {/* Overview */}
        {title.overview ? (
          <Animated.View entering={FadeIn.duration(300).delay(300)}>
            <View className="mt-5 px-4">
              <ExpandableText text={title.overview} actionColor={titleAccent} />
            </View>
          </Animated.View>
        ) : null}

        {/* Availability */}
        {availability.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(400)} className="mt-6">
            <View className="px-4">
              <SectionHeader
                title={t`Where to Watch`}
                icon={providerIcon}
                iconColor={titleAccent}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={titleAvailabilityContentStyle}
            >
              {availability.map((offer) => (
                <View key={`${offer.providerId}-${offer.offerType}`} className="items-center">
                  {offer.logoPath && (
                    <Image
                      source={{ uri: offer.logoPath }}
                      style={titleDetailStyles.providerLogo}
                      contentFit="cover"
                    />
                  )}
                  <Text
                    maxFontSizeMultiplier={1.0}
                    className="text-muted-foreground mt-1 max-w-[60px] text-center text-xs"
                    numberOfLines={1}
                  >
                    {offer.providerName}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Continue Watching */}
        {title.type === "tv" && (
          <ContinueWatchingBanner
            seasons={seasons}
            watchedEpisodeIds={watchedEpisodeIds}
            userStatus={userInfo.data?.status ?? null}
            backdropPath={title.backdropPath}
            backdropThumbHash={title.backdropThumbHash}
          />
        )}

        {/* Seasons & Episodes */}
        {title.type === "tv" && seasons.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(400)} className="mt-6 px-4">
            <SectionHeader title={t`Seasons`} icon={IconList} iconColor={titleAccent} />
            {seasons.map((season) => (
              <SeasonAccordion
                key={season.id}
                season={season}
                episodes={season.episodes ?? []}
                watchedEpisodeIds={watchedEpisodeIds}
              />
            ))}
          </Animated.View>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(500)} className="mt-6">
            <View className="px-4">
              <SectionHeader title={t`Cast`} icon={IconUsers} iconColor={titleAccent} />
            </View>
            <FlashList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={cast}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderCastItem}
              ItemSeparatorComponent={HorizontalListSeparator}
              contentContainerStyle={horizontalListContentStyle}
              style={horizontalListStyle}
            />
          </Animated.View>
        )}

        {/* Recommendations */}
        {recItems.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(600)} className="mt-6">
            <View className="px-4">
              <SectionHeader title={t`More Like This`} icon={IconThumbUp} iconColor={titleAccent} />
            </View>
            <HorizontalPosterRow items={recItems} />
          </Animated.View>
        )}
      </ScrollView>
    </ModalLayout>
  );
}
