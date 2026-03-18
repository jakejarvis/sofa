import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { useCSSVariable, useResolveClassNames } from "uniwind";

import { HeaderAvatar } from "@/components/header-avatar";

export function TabStack({ title, children }: { title?: string; children?: ReactNode }) {
  const contentStyle = useResolveClassNames("bg-background");
  const tintColor = useCSSVariable("--color-primary") as string;
  const backgroundColor = useCSSVariable("--color-background") as string;
  const iosHeaderLargeTitleStyle = useResolveClassNames("font-display text-foreground");
  const iosHeaderTitleStyle = useResolveClassNames("font-display text-foreground text-lg");
  const androidHeaderTitleStyle = useResolveClassNames(
    "text-foreground font-sans text-lg font-semibold",
  );

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
              style={iosHeaderTitleStyle as Record<string, unknown>}
              largeStyle={iosHeaderLargeTitleStyle as Record<string, unknown>}
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
          <Stack.Screen.Title style={androidHeaderTitleStyle as Record<string, unknown>}>
            {title}
          </Stack.Screen.Title>
        </Stack.Screen>
      ) : null}
      {children}
    </Stack>
  );
}
