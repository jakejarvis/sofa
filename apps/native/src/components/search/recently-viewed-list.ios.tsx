import {
  Button,
  Host,
  HStack,
  Image,
  List,
  Section,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  listStyle,
  onTapGesture,
  scrollContentBackground,
} from "@expo/ui/swift-ui/modifiers";
import { IconSearch } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { SFSymbol } from "sf-symbols-typescript";
import { useCSSVariable } from "uniwind";
import { Text as RNText } from "@/components/ui/text";
import {
  type RecentlyViewedItem,
  useRecentlyViewed,
} from "@/lib/recently-viewed";
import * as Haptics from "@/utils/haptics";

const SF_SYMBOL: Record<RecentlyViewedItem["type"], SFSymbol> = {
  movie: "film",
  tv: "tv",
  person: "person.fill",
};

const TYPE_LABEL: Record<RecentlyViewedItem["type"], string> = {
  movie: "Movie",
  tv: "TV Show",
  person: "Person",
};

export function RecentlyViewedList() {
  const { navigate } = useRouter();
  const { items, removeItem, clearAll } = useRecentlyViewed();
  const mutedForeground = useCSSVariable("--color-muted-foreground") as string;

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

  if (items.length === 0) {
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        className="flex-1 items-center justify-center"
      >
        <IconSearch size={64} color={mutedForeground} />
        <RNText className="mt-3 text-[15px] text-muted-foreground">
          Search for movies, shows, or people
        </RNText>
      </Animated.View>
    );
  }

  return (
    <View className="flex-1">
      <Host colorScheme="dark" style={{ flex: 1 }}>
        <List
          modifiers={[listStyle("plain"), scrollContentBackground("hidden")]}
        >
          <Section
            header={
              <HStack>
                <Image systemName="clock.arrow.circlepath" size={14} />
                <Text modifiers={[font({ weight: "semibold", size: 14 })]}>
                  Recently Viewed
                </Text>
                <Spacer />
                <Button
                  label="Clear"
                  onPress={handleClear}
                  modifiers={[
                    font({ size: 14 }),
                    foregroundStyle({
                      type: "hierarchical",
                      style: "secondary",
                    }),
                  ]}
                />
              </HStack>
            }
          >
            <List.ForEach onDelete={handleDelete}>
              {items.map((item) => (
                <HStack
                  key={item.id}
                  spacing={12}
                  alignment="center"
                  modifiers={[onTapGesture(() => handlePress(item))]}
                >
                  <Image
                    systemName={SF_SYMBOL[item.type]}
                    size={20}
                    modifiers={[
                      foregroundStyle({
                        type: "hierarchical",
                        style: "secondary",
                      }),
                    ]}
                  />
                  <VStack alignment="leading" spacing={2}>
                    <Text
                      modifiers={[
                        font({ weight: "medium", size: 16 }),
                        foregroundStyle({
                          type: "hierarchical",
                          style: "primary",
                        }),
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      modifiers={[
                        font({ size: 13 }),
                        foregroundStyle({
                          type: "hierarchical",
                          style: "secondary",
                        }),
                      ]}
                    >
                      {TYPE_LABEL[item.type]}
                      {item.subtitle ? ` · ${item.subtitle}` : ""}
                    </Text>
                  </VStack>
                  <Spacer />
                </HStack>
              ))}
            </List.ForEach>
          </Section>
        </List>
      </Host>
    </View>
  );
}
