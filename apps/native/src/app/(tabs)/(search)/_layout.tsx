import { Stack } from "expo-router";
import { useTabScreenOptions } from "@/hooks/use-tab-screen-options";

export default function SearchLayout() {
  return (
    <Stack screenOptions={useTabScreenOptions()}>
      <Stack.Screen name="index" options={{ title: "Search" }} />
    </Stack>
  );
}
