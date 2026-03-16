import type { Stack } from "expo-router";
import type { ComponentProps } from "react";
import { useCSSVariable, useResolveClassNames } from "uniwind";
import { HeaderAvatar } from "@/components/header-avatar";

type ScreenOptions = NonNullable<
  Extract<ComponentProps<typeof Stack>["screenOptions"], object>
>;

export function useTabScreenOptions() {
  const backgroundColor = useCSSVariable("--color-background") as string;
  const headerTitleStyle = useResolveClassNames(
    "font-sans font-semibold text-lg text-foreground",
  );
  const contentStyle = useResolveClassNames("bg-background");

  return {
    headerLargeTitle: false,
    headerTransparent: false,
    headerStyle: { backgroundColor },
    headerTitleAlign: "left" as const,
    headerTitleStyle: headerTitleStyle as Record<string, unknown>,
    headerTintColor: useCSSVariable("--color-primary") as string,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal" as const,
    headerRight: () => <HeaderAvatar />,
    contentStyle,
  } satisfies ScreenOptions;
}
