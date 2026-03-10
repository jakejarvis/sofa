import { IconArrowLeft, IconMovie, IconUser } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  type TextLayoutEventData,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PosterCard } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { orpc } from "@/utils/orpc";

function ExpandableBio({ text }: { text: string }) {
  const maxLines = 4;
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (!needsTruncation && e.nativeEvent.lines.length > maxLines) {
        setNeedsTruncation(true);
      }
    },
    [needsTruncation],
  );

  return (
    <View className="mb-6 px-4">
      <Text
        numberOfLines={expanded ? undefined : maxLines}
        onTextLayout={onTextLayout}
        style={{
          fontSize: 14,
          lineHeight: 22,
          color: colors.foreground,
        }}
      >
        {text}
      </Text>
      {needsTruncation && (
        <Pressable onPress={() => setExpanded(!expanded)} className="mt-1">
          <Text
            style={{
              fontSize: 13,
              color: colors.primary,
              fontFamily: fonts.sansMedium,
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, isPending } = useQuery(
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
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: colors.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        className="absolute z-10 items-center justify-center rounded-full"
        style={{
          top: insets.top + 8,
          left: 16,
          width: 36,
          height: 36,
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <IconArrowLeft size={20} color="white" />
      </Pressable>

      {/* Profile hero */}
      <View
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

        {person.knownForDepartment && (
          <View
            className="mt-2 rounded-full px-3 py-1"
            style={{ backgroundColor: colors.secondary }}
          >
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {person.knownForDepartment}
            </Text>
          </View>
        )}

        {(person.birthday || person.deathday) && (
          <Text
            style={{
              fontSize: 13,
              color: colors.mutedForeground,
              marginTop: 8,
            }}
          >
            {person.birthday?.slice(0, 4)}
            {person.deathday ? ` — ${person.deathday.slice(0, 4)}` : ""}
          </Text>
        )}
      </View>

      {/* Biography */}
      {person.biography && <ExpandableBio text={person.biography} />}

      {/* Filmography */}
      {filmography.length > 0 && (
        <View className="px-4">
          <SectionHeader title="Filmography" icon={IconMovie} />
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {filmography.map((credit) => (
              <View key={credit.titleId} style={{ width: "47%" }}>
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
                {credit.character && (
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
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
