import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { useCSSVariable, useResolveClassNames } from "uniwind";

import { HeaderAvatar } from "@/components/header-avatar";

export function TabStack({ title, children }: { title?: string; children?: ReactNode }) {
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
              element: <HeaderAvatar />,
              hidesSharedBackground: true,
            },
          ],
        }}
      >
        {title ? (
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
              {title}
            </Stack.Screen.Title>
          </Stack.Screen>
        ) : null}
        {children}
      </Stack>
    );
  }

  return (
    <Stack
      screenOptions={{
        contentStyle,
        headerTitleAlign: "left",
        headerRight: () => <HeaderAvatar />,
      }}
    >
      {title ? (
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
            {title}
          </Stack.Screen.Title>
        </Stack.Screen>
      ) : null}
      {children}
    </Stack>
  );
}
