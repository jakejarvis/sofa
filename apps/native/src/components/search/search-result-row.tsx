import { IconLoader, IconPlus } from "@tabler/icons-react-native";
import { Image } from "expo-image";
import { memo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export interface SearchResultItem {
  tmdbId: number;
  title: string;
  type: "movie" | "tv" | "person";
  posterPath?: string | null;
  profilePath?: string | null;
  releaseDate?: string | null;
}

export const SearchResultRow = memo(function SearchResultRow({
  item,
  onResolve,
  onQuickAdd,
  isResolving,
  isAdding,
}: {
  item: SearchResultItem;
  onResolve: (item: SearchResultItem) => void;
  onQuickAdd: (tmdbId: number, type: "movie" | "tv") => void;
  isResolving: boolean;
  isAdding: boolean;
}) {
  const imageSrc = item.posterPath ?? item.profilePath;

  return (
    <Pressable
      onPress={() => onResolve(item)}
      disabled={isResolving}
      className="flex-row items-center px-4 py-3"
      style={{
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        opacity: isResolving ? 0.6 : 1,
      }}
    >
      <View
        className="mr-3 overflow-hidden"
        style={{
          width: 44,
          height: item.type === "person" ? 44 : 66,
          backgroundColor: colors.secondary,
          borderRadius: item.type === "person" ? 22 : 8,
          borderCurve: item.type === "person" ? undefined : "continuous",
        }}
      >
        {imageSrc ? (
          <Image
            source={{ uri: imageSrc }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : null}
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
          {item.releaseDate ? (
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {item.releaseDate.slice(0, 4)}
            </Text>
          ) : null}
        </View>
      </View>

      {item.type !== "person" && (
        <Pressable
          onPress={() => onQuickAdd(item.tmdbId, item.type as "movie" | "tv")}
          disabled={isAdding}
          hitSlop={8}
          className="ml-2"
        >
          {isAdding ? (
            <IconLoader size={22} color={colors.primary} />
          ) : (
            <IconPlus size={22} color={colors.primary} />
          )}
        </Pressable>
      )}

      {isResolving && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginLeft: 8 }}
        />
      )}
    </Pressable>
  );
});
