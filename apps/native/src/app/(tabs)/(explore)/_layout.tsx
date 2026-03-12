import { Stack } from "expo-router";
import { useTabScreenOptions } from "@/hooks/use-tab-screen-options";

export default function ExploreLayout() {
  return <Stack screenOptions={useTabScreenOptions()} />;
}
