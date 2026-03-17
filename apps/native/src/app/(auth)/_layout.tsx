import { Stack } from "expo-router";
import { useResolveClassNames } from "uniwind";
import { hasStoredServerUrl } from "@/lib/server-url";

export const unstable_settings = {
  initialRouteName:
    process.env.EXPO_PUBLIC_SERVER_URL || hasStoredServerUrl()
      ? "login"
      : "server-url",
};

export default function AuthLayout() {
  const contentStyle = useResolveClassNames("bg-background");

  return (
    <Stack
      screenOptions={{
        contentStyle,
        headerShown: false,
        navigationBarHidden: true,
        animation: "fade",
      }}
    />
  );
}
