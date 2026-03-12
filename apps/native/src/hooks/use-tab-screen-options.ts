import type { Stack } from "expo-router";
import type { ComponentProps } from "react";
import { useCSSVariable, useResolveClassNames } from "uniwind";

type ScreenOptions = NonNullable<
  Extract<ComponentProps<typeof Stack>["screenOptions"], object>
>;

export function useTabScreenOptions() {
  const headerLargeTitleStyle = useResolveClassNames(
    "font-display text-foreground",
  );
  const headerTitleStyle = useResolveClassNames(
    "font-display text-lg text-foreground",
  );
  const contentStyle = useResolveClassNames("bg-background");

  return {
    headerLargeTitleEnabled: true,
    headerTransparent: true,
    headerBlurEffect: "dark" as const,
    headerLargeStyle: { backgroundColor: "transparent" },
    headerLargeTitleStyle: headerLargeTitleStyle as Record<string, unknown>,
    headerTitleStyle: headerTitleStyle as Record<string, unknown>,
    headerTintColor: useCSSVariable("--color-primary") as string,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerBackButtonDisplayMode: "minimal" as const,
    contentStyle,
  } satisfies ScreenOptions;
}
