import { Stack } from "expo-router";
import { useCSSVariable, useResolveClassNames } from "uniwind";
import { hasStoredServerUrl } from "@/lib/server-url";

export const unstable_settings = {
  initialRouteName:
    process.env.EXPO_PUBLIC_SERVER_URL || hasStoredServerUrl()
      ? "login"
      : "server-url",
};

export default function AuthLayout() {
  const headerTitleStyle = useResolveClassNames(
    "font-display text-base text-foreground",
  );
  const contentStyle = useResolveClassNames("bg-background");
  const tintColor = useCSSVariable("--color-primary") as string;

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTitleStyle: headerTitleStyle as Record<string, unknown>,
        headerTintColor: tintColor,
        contentStyle,
        animation: "fade",
      }}
    />
  );
}
