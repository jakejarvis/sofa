import { Host, List, RNHostView, VStack } from "@expo/ui/swift-ui";
import {
  deleteDisabled,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listStyle,
  onTapGesture,
  scrollContentBackground,
} from "@expo/ui/swift-ui/modifiers";
import { Trans, useLingui } from "@lingui/react/macro";
import { IconHistory, IconSearch } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert, Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { RecentlyViewedRowContent } from "@/components/search/recently-viewed-row-content";
import { Text } from "@/components/ui/text";
import { type RecentlyViewedItem, useRecentlyViewed } from "@/lib/recently-viewed";
import * as Haptics from "@/utils/haptics";

export function RecentlyViewedList() {
  const { t } = useLingui();
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
    (indices: number[]) => {
      for (const index of indices) {
        const item = items[index];
        if (item) removeItem(item.id);
      }
    },
    [items, removeItem],
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
    <View className="flex-1">
      <Host colorScheme="dark" style={{ flex: 1 }}>
        <List modifiers={[listStyle("plain"), scrollContentBackground("hidden")]}>
          <VStack
            modifiers={[
              listRowBackground("clear"),
              listRowInsets({ leading: 0, trailing: 0 }),
              listRowSeparator("hidden"),
              deleteDisabled(),
            ]}
          >
            <RNHostView matchContents>
              <View className="bg-background flex-row items-center justify-between px-2">
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
              </View>
            </RNHostView>
          </VStack>
          <List.ForEach onDelete={handleDelete}>
            {items.map((item) => (
              <VStack
                key={item.id}
                modifiers={[
                  listRowBackground("clear"),
                  listRowInsets({ leading: 0, trailing: 0 }),
                  onTapGesture(() => handlePress(item)),
                ]}
              >
                <RNHostView matchContents>
                  <View className="bg-background px-2">
                    <RecentlyViewedRowContent item={item} />
                  </View>
                </RNHostView>
              </VStack>
            ))}
          </List.ForEach>
        </List>
      </Host>
    </View>
  );
}
