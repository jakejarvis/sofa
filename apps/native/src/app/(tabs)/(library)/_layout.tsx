import { useLingui } from "@lingui/react/macro";
import { Stack } from "expo-router";
import { useAtom } from "jotai";
import { View } from "react-native";
import { useCSSVariable, useResolveClassNames } from "uniwind";

import { HeaderAvatar } from "@/components/header-avatar";
import { SortMenu } from "@/components/library/sort-menu";
import { type SortBy, librarySortByAtom, librarySortDirectionAtom } from "@/lib/library-atoms";

function LibraryHeaderRight() {
  const [sortBy, setSortBy] = useAtom(librarySortByAtom);
  const [sortDirection, setSortDirection] = useAtom(librarySortDirectionAtom);

  return (
    <View className="flex-row items-center gap-4">
      <SortMenu
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={(newSort, newDir) => {
          setSortBy(newSort as SortBy);
          setSortDirection(newDir);
        }}
      />
      <HeaderAvatar />
    </View>
  );
}

export default function LibraryLayout() {
  const { t } = useLingui();
  const contentStyle = useResolveClassNames("bg-background");
  const tintColor = useCSSVariable("--color-primary") as string;
  const backgroundColor = useCSSVariable("--color-background") as string;
  const headerTitleStyle = useResolveClassNames("font-display text-foreground text-xl");
  const headerLargeTitleStyle = useResolveClassNames("font-display text-foreground");

  if (process.env.EXPO_OS === "ios") {
    return (
      <Stack
        screenOptions={{
          contentStyle,
          unstable_headerRightItems: () => [
            {
              type: "custom" as const,
              element: <LibraryHeaderRight />,
              hidesSharedBackground: true,
            },
          ],
        }}
      >
        <Stack.Screen name="index">
          <Stack.Header
            transparent
            blurEffect="systemChromeMaterialDark"
            style={{ color: tintColor, shadowColor: "transparent" }}
            largeStyle={{
              backgroundColor: "transparent",
              shadowColor: "transparent",
            }}
          />
          <Stack.Screen.Title
            large
            style={headerTitleStyle as Record<string, unknown>}
            largeStyle={headerLargeTitleStyle as Record<string, unknown>}
          >
            {t`Library`}
          </Stack.Screen.Title>
        </Stack.Screen>
      </Stack>
    );
  }

  return (
    <Stack
      screenOptions={{
        contentStyle,
        headerTitleAlign: "left",
        headerRight: () => <LibraryHeaderRight />,
      }}
    >
      <Stack.Screen name="index">
        <Stack.Header
          transparent={false}
          style={{
            backgroundColor,
            color: tintColor,
            shadowColor: "transparent",
          }}
        />
        <Stack.Screen.Title style={headerTitleStyle as Record<string, unknown>}>
          {t`Library`}
        </Stack.Screen.Title>
      </Stack.Screen>
    </Stack>
  );
}
