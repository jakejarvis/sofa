import { Stack } from "expo-router";
import { useCSSVariable, useResolveClassNames } from "uniwind";

export function AuthStackHeader({ title }: { title: string }) {
  const headerTitleStyle = useResolveClassNames(
    "font-display text-base text-foreground",
  );
  const tintColor = useCSSVariable("--color-primary") as string;

  return (
    <>
      <Stack.Header
        transparent
        style={{ color: tintColor, shadowColor: "transparent" }}
      />
      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title style={headerTitleStyle as Record<string, unknown>}>
        {title}
      </Stack.Screen.Title>
    </>
  );
}
