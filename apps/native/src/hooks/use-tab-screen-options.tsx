import type { Stack } from "expo-router";
import type { ComponentProps } from "react";
import { useCSSVariable, useResolveClassNames } from "uniwind";
import { HeaderAvatar } from "@/components/header-avatar";

type ScreenOptions = NonNullable<
  Extract<ComponentProps<typeof Stack>["screenOptions"], object>
>;

export function useTabScreenOptions() {
  const headerLargeTitleStyle = useResolveClassNames(
    "font-display text-foreground",
  );
  const headerTitleStyle = useResolveClassNames(
    "font-display text-foreground text-lg",
  );
  const contentStyle = useResolveClassNames("bg-background");

  return {
    headerLargeTitle: true,
    headerTransparent: true,
    headerBlurEffect: "dark" as const,
    headerLargeStyle: { backgroundColor: "transparent" },
    headerLargeTitleStyle: headerLargeTitleStyle as Record<string, unknown>,
    headerTitleStyle: headerTitleStyle as Record<string, unknown>,
    headerTintColor: useCSSVariable("--color-primary") as string,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerBackButtonDisplayMode: "minimal" as const,
    scrollEdgeEffects: {
      top: "hidden" as const,
      bottom: "hidden" as const,
      left: "hidden" as const,
      right: "hidden" as const,
    },
    unstable_headerRightItems: () => [
      {
        type: "custom" as const,
        element: <HeaderAvatar />,
        hidesSharedBackground: true,
      },
    ],
    contentStyle,
  } satisfies ScreenOptions;
}
