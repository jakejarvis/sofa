import { useLingui } from "@lingui/react/macro";
import { IconHistory } from "@tabler/icons-react-native";
import { Stack, useRouter } from "expo-router";
import { useAtom } from "jotai";
import { Pressable, View } from "react-native";
import { useCSSVariable, useResolveClassNames } from "uniwind";

import { HeaderAvatar } from "@/components/header-avatar";
import { SortMenu } from "@/components/library/sort-menu";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { type SortBy, librarySortByAtom, librarySortDirectionAtom } from "@/lib/library-atoms";
import * as Haptics from "@/utils/haptics";

function LibraryHeaderRight() {
  const { t } = useLingui();
  const router = useRouter();
  const foregroundColor = useCSSVariable("--color-foreground") as string;
  const [sortBy, setSortBy] = useAtom(librarySortByAtom);
  const [sortDirection, setSortDirection] = useAtom(librarySortDirectionAtom);

  return (
    <View className="flex-row items-center gap-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t`History`}
        hitSlop={8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/(tabs)/(library)/history");
        }}
      >
        <ScaledIcon icon={IconHistory} size={22} color={foregroundColor} />
      </Pressable>
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

function renderLibraryHeaderRight() {
  return <LibraryHeaderRight />;
}

function getLibraryHeaderRightItems() {
  return [
    {
      type: "custom" as const,
      element: <LibraryHeaderRight />,
      hidesSharedBackground: true,
    },
  ];
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
      <Stack screenOptions={{ contentStyle }}>
        <Stack.Screen
          name="index"
          options={{ unstable_headerRightItems: getLibraryHeaderRightItems }}
        >
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
      }}
    >
      <Stack.Screen name="index" options={{ headerRight: renderLibraryHeaderRight }}>
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
