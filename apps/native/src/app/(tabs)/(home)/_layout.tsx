import { Stack } from "expo-router";
import { useTabScreenOptions } from "@/hooks/use-tab-screen-options";

export default function HomeLayout() {
  return <Stack screenOptions={useTabScreenOptions()} />;
}
