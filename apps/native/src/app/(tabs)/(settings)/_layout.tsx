import { Stack } from "expo-router";
import { useTabScreenOptions } from "@/hooks/use-tab-screen-options";

export default function SettingsLayout() {
  return <Stack screenOptions={useTabScreenOptions()} />;
}
