import { FlashList } from "@shopify/flash-list";
import { IconHistory, IconSearch } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { RecentlyViewedRow } from "@/components/search/recently-viewed-row";
import { Text } from "@/components/ui/text";
import {
  type RecentlyViewedItem,
  useRecentlyViewed,
} from "@/lib/recently-viewed";
import * as Haptics from "@/utils/haptics";

export function RecentlyViewedList() {
  const { navigate } = useRouter();
  const { items, removeItem, clearAll } = useRecentlyViewed();
  const [mutedForeground, primaryColor] = useCSSVariable([
    "--color-muted-foreground",
    "--color-primary",
  ]) as [string, string];

  const handlePress = useCallback(
    (item: RecentlyViewedItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (item.type === "person") {
        navigate(`/person/${item.id}`);
      } else {
        navigate(`/title/${item.id}`);
      }
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      removeItem(id);
    },
    [removeItem],
  );

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Clear Recently Viewed?",
      "This will remove all items from your history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => clearAll(),
        },
      ],
    );
  }, [clearAll]);

  const renderItem = useCallback(
    ({ item }: { item: RecentlyViewedItem }) => (
      <RecentlyViewedRow
        item={item}
        onPress={handlePress}
        onDelete={handleDelete}
      />
    ),
    [handlePress, handleDelete],
  );

  const keyExtractor = useCallback((item: RecentlyViewedItem) => item.id, []);

  if (items.length === 0) {
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        className="flex-1 items-center justify-center"
      >
        <IconSearch size={64} color={mutedForeground} />
        <Text className="mt-3 text-[15px] text-muted-foreground">
          Search for movies, shows, or people
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} className="flex-1">
      <FlashList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <Animated.View
            entering={FadeInDown.duration(300)}
            className="mb-1 flex-row items-center justify-between px-4 pt-2 pb-1"
          >
            <View className="flex-row items-center gap-2">
              <IconHistory size={20} color={primaryColor} />
              <Text className="font-display text-[20px] text-foreground tracking-tight">
                Recently Viewed
              </Text>
            </View>
            <Pressable
              onPress={handleClear}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text className="text-[13px] text-primary">Clear</Text>
            </Pressable>
          </Animated.View>
        }
      />
    </Animated.View>
  );
}
