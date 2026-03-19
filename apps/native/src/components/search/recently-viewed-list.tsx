import { Trans, useLingui } from "@lingui/react/macro";
import { FlashList } from "@shopify/flash-list";
import { IconHistory, IconSearch } from "@tabler/icons-react-native";
import { useCallback, useMemo } from "react";
import { Alert, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { RecentlyViewedRow } from "@/components/search/recently-viewed-row";
import { Text } from "@/components/ui/text";
import { type RecentlyViewedItem, useRecentlyViewed } from "@/lib/recently-viewed";
import * as Haptics from "@/utils/haptics";

export function RecentlyViewedList() {
  const { t } = useLingui();
  const { items, removeItem, clearAll } = useRecentlyViewed();
  const [mutedForeground, primaryColor] = useCSSVariable([
    "--color-muted-foreground",
    "--color-primary",
  ]) as [string, string];

  const handleDelete = useCallback(
    (id: string) => {
      removeItem(id);
    },
    [removeItem],
  );

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t`Clear Recently Viewed?`, t`This will remove all items from your history.`, [
      { text: t`Cancel`, style: "cancel" },
      {
        text: t`Clear`,
        style: "destructive",
        onPress: () => clearAll(),
      },
    ]);
  }, [clearAll, t]);

  const renderItem = useCallback(
    ({ item }: { item: RecentlyViewedItem }) => (
      <RecentlyViewedRow item={item} onDelete={handleDelete} />
    ),
    [handleDelete],
  );

  const keyExtractor = useCallback((item: RecentlyViewedItem) => item.id, []);

  const listHeaderComponent = useMemo(
    () => (
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="mb-1 flex-row items-center justify-between px-4 pt-2 pb-1"
      >
        <View className="flex-row items-center gap-2">
          <IconHistory size={20} color={primaryColor} />
          <Text className="font-display text-foreground text-xl tracking-tight">
            <Trans>Recently Viewed</Trans>
          </Text>
        </View>
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="text-primary text-sm">
            <Trans>Clear</Trans>
          </Text>
        </Pressable>
      </Animated.View>
    ),
    [primaryColor, handleClear],
  );

  if (items.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(400)} className="flex-1 items-center justify-center">
        <IconSearch size={64} color={mutedForeground} />
        <Text className="text-muted-foreground mt-3 text-base">
          <Trans>Search for movies, shows, or people</Trans>
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
        ListHeaderComponent={listHeaderComponent}
      />
    </Animated.View>
  );
}
