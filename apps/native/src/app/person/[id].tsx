import {
  IconAlertTriangle,
  IconMovie,
  IconUser,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExpandableText } from "@/components/ui/expandable-text";
import { PosterCard } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { orpc } from "@/utils/orpc";

const FILMOGRAPHY_GAP = 12;
const FILMOGRAPHY_PADDING = 16;

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { back } = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth =
    (screenWidth - FILMOGRAPHY_PADDING * 2 - FILMOGRAPHY_GAP) / 2;

  const { data, isPending, isError } = useQuery(
    orpc.people.detail.queryOptions({ input: { id } }),
  );

  if (isPending) {
    return (
      <View
        style={{
          backgroundColor: colors.background,
          flex: 1,
          paddingTop: insets.top + 56,
        }}
        className="items-center"
      >
        {/* Profile photo skeleton */}
        <Skeleton width={120} height={120} borderRadius={60} />
        {/* Name skeleton */}
        <Skeleton
          width={180}
          height={28}
          borderRadius={6}
          style={{ marginTop: 16 }}
        />
        {/* Department badge skeleton */}
        <Skeleton
          width={80}
          height={24}
          borderRadius={12}
          style={{ marginTop: 8 }}
        />
        {/* Bio skeleton */}
        <View
          style={{
            alignSelf: "stretch",
            paddingHorizontal: 16,
            marginTop: 24,
            gap: 8,
          }}
        >
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="60%" height={14} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{
          backgroundColor: colors.background,
          paddingTop: insets.top,
        }}
      >
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <IconAlertTriangle size={48} color={colors.mutedForeground} />
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 20,
              color: colors.foreground,
              marginTop: 12,
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.mutedForeground,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Could not load person details
          </Text>
          <Pressable onPress={() => back()} className="mt-4">
            <Text style={{ color: colors.primary }}>Go back</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const person = data?.person;
  const filmography = data?.filmography ?? [];

  if (!person) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{
          backgroundColor: colors.background,
          paddingTop: insets.top,
        }}
      >
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <IconUser size={48} color={colors.mutedForeground} />
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 20,
              color: colors.foreground,
              marginTop: 12,
            }}
          >
            Person not found
          </Text>
          <Pressable onPress={() => back()} className="mt-4">
            <Text style={{ color: colors.primary }}>Go back</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: person?.name ?? "",
          headerTransparent: true,
          headerBlurEffect: "none",
          headerTintColor: "white",
          headerBackButtonDisplayMode: "minimal",
          headerTitle: "",
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Profile hero */}
        <Animated.View
          entering={FadeIn.duration(400)}
          className="items-center"
          style={{ paddingTop: insets.top + 56, paddingBottom: 24 }}
        >
          <View
            className="overflow-hidden"
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: colors.secondary,
            }}
          >
            {person.profilePath && (
              <Image
                source={{ uri: person.profilePath }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            )}
          </View>

          <Text
            selectable
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: colors.foreground,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            {person.name}
          </Text>

          {person.knownForDepartment ? (
            <View
              className="mt-2 rounded-full px-3 py-1"
              style={{ backgroundColor: colors.secondary }}
            >
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                {person.knownForDepartment}
              </Text>
            </View>
          ) : null}

          {person.birthday || person.deathday ? (
            <Text
              selectable
              style={{
                fontSize: 13,
                color: colors.mutedForeground,
                marginTop: 8,
              }}
            >
              {person.birthday?.slice(0, 4)}
              {person.deathday ? ` — ${person.deathday.slice(0, 4)}` : ""}
            </Text>
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

        {/* Filmography */}
        {filmography.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(200)}
            className="px-4"
          >
            <SectionHeader title="Filmography" icon={IconMovie} />
            <View
              className="flex-row flex-wrap"
              style={{ gap: FILMOGRAPHY_GAP }}
            >
              {filmography.map((credit) => (
                <View key={credit.titleId} style={{ width: columnWidth }}>
                  <PosterCard
                    id={credit.titleId}
                    tmdbId={credit.tmdbId}
                    title={credit.title}
                    type={credit.type}
                    posterPath={credit.posterPath}
                    releaseDate={credit.releaseDate ?? credit.firstAirDate}
                    voteAverage={credit.voteAverage}
                    userStatus={data?.userStatuses?.[credit.titleId] ?? null}
                    width={undefined}
                  />
                  {credit.character ? (
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        color: colors.mutedForeground,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      as {credit.character}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </>
  );
}
