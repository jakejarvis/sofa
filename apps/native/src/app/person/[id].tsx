import {
  IconAlertTriangle,
  IconCalendar,
  IconMapPin,
  IconMovie,
  IconUser,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { FlatList, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { ExpandableText } from "@/components/ui/expandable-text";
import { Image } from "@/components/ui/image";
import { PosterCard } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";
import { addRecentlyViewed } from "@/lib/recently-viewed";

const FILMOGRAPHY_GAP = 12;
const FILMOGRAPHY_PADDING = 16;

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

const departmentLabels: Record<string, string> = {
  Acting: "Actor",
  Directing: "Director",
  Writing: "Writer",
  Production: "Producer",
  Editing: "Editor",
};

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { back } = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth =
    (screenWidth - FILMOGRAPHY_PADDING * 2 - FILMOGRAPHY_GAP) / 2;

  const mutedForeground = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;

  const { data, isPending, isError } = useQuery(
    orpc.people.detail.queryOptions({ input: { id } }),
  );

  const person = data?.person;
  const filmography = data?.filmography ?? [];

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
      <View style={{ width: columnWidth }}>
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
      </View>
    ),
    [columnWidth, data?.userStatuses],
  );

  if (isPending) {
    return (
      <View
        className="flex-1 items-center bg-background"
        style={{ paddingTop: insets.top + 56 }}
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
        <View className="mt-6 gap-2 self-stretch px-4">
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="60%" height={14} />
        </View>
      </View>
    );
  }

  if (isError && !data) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top }}
      >
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <IconAlertTriangle size={48} color={mutedForeground} />
          <Text className="mt-3 font-display text-foreground text-xl">
            Something went wrong
          </Text>
          <Text className="mt-1 text-center text-muted-foreground text-sm">
            Could not load person details
          </Text>
          <Pressable onPress={() => back()} className="mt-4">
            <Text className="text-primary">Go back</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (!person) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top }}
      >
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <IconUser size={48} color={mutedForeground} />
          <Text className="mt-3 font-display text-foreground text-xl">
            Person not found
          </Text>
          <Pressable onPress={() => back()} className="mt-4">
            <Text className="text-primary">Go back</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const listHeader = (
    <>
      {/* Profile hero */}
      <Animated.View
        entering={FadeIn.duration(400)}
        className="items-center"
        style={{ paddingTop: insets.top + 56, paddingBottom: 24 }}
      >
        <View className="size-[120px] overflow-hidden rounded-full bg-secondary">
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
          className="mt-4 text-center font-display text-[28px] text-foreground"
        >
          {person.name}
        </Text>

        {person.knownForDepartment ? (
          <View className="mt-2 rounded-full bg-secondary px-3 py-1">
            <Text className="text-muted-foreground text-xs uppercase tracking-wider">
              {departmentLabels[person.knownForDepartment] ??
                person.knownForDepartment}
            </Text>
          </View>
        ) : null}

        {person.birthday || person.placeOfBirth ? (
          <View className="mt-3 items-center gap-1.5">
            {person.birthday ? (
              <View className="flex-row items-center gap-1.5">
                <IconCalendar size={14} color={primaryColor} />
                <Text selectable className="text-[13px] text-muted-foreground">
                  {format(parseISO(person.birthday), "MMMM d, yyyy")}
                  {(() => {
                    const age = calculateAge(person.birthday, person.deathday);
                    return person.deathday
                      ? ` (died at ${age})`
                      : ` (age ${age})`;
                  })()}
                </Text>
              </View>
            ) : null}
            {person.placeOfBirth ? (
              <View className="flex-row items-center gap-1.5">
                <IconMapPin size={14} color={primaryColor} />
                <Text selectable className="text-[13px] text-muted-foreground">
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
        <Animated.View
          entering={FadeInDown.duration(300).delay(200)}
          className="px-4"
        >
          <SectionHeader title="Filmography" icon={IconMovie} />
        </Animated.View>
      )}
    </>
  );

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
      <FlatList
        data={filmography}
        keyExtractor={(item) => item.titleId}
        renderItem={renderFilmographyItem}
        numColumns={2}
        columnWrapperStyle={{
          gap: FILMOGRAPHY_GAP,
          paddingHorizontal: FILMOGRAPHY_PADDING,
        }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
          gap: FILMOGRAPHY_GAP,
        }}
        ListHeaderComponent={listHeader}
        className="bg-background"
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
      />
    </>
  );
}
