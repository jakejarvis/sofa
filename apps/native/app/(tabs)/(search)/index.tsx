import {
  IconLoader,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { orpc, queryClient } from "@/utils/orpc";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface SearchResultItem {
  tmdbId: number;
  title: string;
  type: "movie" | "tv" | "person";
  posterPath?: string | null;
  profilePath?: string | null;
  releaseDate?: string | null;
}

function SearchResultRow({ item }: { item: SearchResultItem }) {
  const router = useRouter();

  const resolveTitleMutation = useMutation(
    orpc.titles.resolve.mutationOptions({
      onSuccess: ({ id }) => {
        if (id) router.push(`/title/${id}`);
      },
    }),
  );

  const resolvePersonMutation = useMutation(
    orpc.people.resolve.mutationOptions({
      onSuccess: ({ id }) => {
        if (id) router.push(`/person/${id}`);
      },
    }),
  );

  const quickAddMutation = useMutation(
    orpc.watchlist.quickAdd.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
      },
    }),
  );

  const handlePress = useCallback(() => {
    if (item.type === "person") {
      resolvePersonMutation.mutate({ tmdbId: item.tmdbId });
    } else {
      resolveTitleMutation.mutate({
        tmdbId: item.tmdbId,
        type: item.type,
      });
    }
  }, [item, resolveTitleMutation, resolvePersonMutation]);

  const imageSrc = item.posterPath ?? item.profilePath;
  const isPending =
    resolveTitleMutation.isPending || resolvePersonMutation.isPending;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isPending}
      className="flex-row items-center px-4 py-3"
      style={{
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <View
        className="mr-3 overflow-hidden"
        style={{
          width: 44,
          height: item.type === "person" ? 44 : 66,
          backgroundColor: colors.secondary,
          borderRadius: item.type === "person" ? 22 : 8,
        }}
      >
        {imageSrc && (
          <Image
            source={{ uri: imageSrc }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        )}
      </View>

      <View className="flex-1">
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 15,
            color: colors.foreground,
          }}
        >
          {item.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: colors.secondary }}
          >
            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>
              {item.type === "movie"
                ? "Movie"
                : item.type === "tv"
                  ? "TV"
                  : "Person"}
            </Text>
          </View>
          {item.releaseDate && (
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {item.releaseDate.slice(0, 4)}
            </Text>
          )}
        </View>
      </View>

      {item.type !== "person" && (
        <Pressable
          onPress={() => {
            quickAddMutation.mutate({
              tmdbId: item.tmdbId,
              type: item.type as "movie" | "tv",
            });
          }}
          disabled={quickAddMutation.isPending}
          hitSlop={8}
          className="ml-2"
        >
          {quickAddMutation.isPending ? (
            <IconLoader size={22} color={colors.primary} />
          ) : (
            <IconPlus size={22} color={colors.primary} />
          )}
        </Pressable>
      )}

      {isPending && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginLeft: 8 }}
        />
      )}
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);

  const searchResults = useQuery({
    ...orpc.search.queryOptions({ input: { query: debouncedQuery } }),
    enabled: debouncedQuery.length > 0,
  });

  const allResults: SearchResultItem[] =
    searchResults.data?.results?.map((r) => ({
      tmdbId: r.tmdbId,
      title: r.title,
      type: r.type,
      posterPath: r.posterPath,
      profilePath: r.profilePath,
      releaseDate: r.releaseDate,
    })) ?? [];

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      {/* Search bar */}
      <View
        className="mx-4 mb-2 flex-row items-center rounded-xl px-3"
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          height: 44,
        }}
      >
        <IconSearch
          size={18}
          color={colors.mutedForeground}
          style={{ marginRight: 8 }}
        />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search movies, shows, people..."
          placeholderTextColor={colors.mutedForeground}
          style={{
            flex: 1,
            color: colors.foreground,
            fontFamily: fonts.sans,
            fontSize: 15,
          }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <IconX size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {debouncedQuery.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <IconSearch size={64} color={colors.mutedForeground} />
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 15,
              marginTop: 12,
            }}
          >
            Search for movies, shows, or people
          </Text>
        </View>
      ) : searchResults.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : allResults.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            No results for "{debouncedQuery}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={allResults}
          keyExtractor={(item) => `${item.type}-${item.tmdbId}`}
          renderItem={({ item }) => <SearchResultRow item={item} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        />
      )}
    </View>
  );
}
