import { Stack } from "expo-router";
import { useCSSVariable, useResolveClassNames } from "uniwind";

export default function HomeLayout() {
  const headerLargeTitleStyle = useResolveClassNames(
    "font-display text-foreground",
  );
  const headerTitleStyle = useResolveClassNames("text-foreground");
  const contentStyle = useResolveClassNames("bg-background");

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: "systemMaterialDark",
        headerLargeTitleStyle: headerLargeTitleStyle as { color?: string },
        headerTitleStyle: headerTitleStyle as { color?: string },
        headerTintColor: useCSSVariable("--color-primary") as string,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle,
      }}
    />
  );
}
