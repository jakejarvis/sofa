import { Stack } from "expo-router";
import { useResolveClassNames } from "uniwind";

export default function AuthLayout() {
  const contentStyle = useResolveClassNames("bg-background");

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle,
        animation: "fade",
      }}
    />
  );
}
