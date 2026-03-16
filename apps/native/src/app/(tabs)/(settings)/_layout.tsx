import { Stack } from "expo-router";
import { useTabScreenOptions } from "@/hooks/use-tab-screen-options";

export default function SettingsLayout() {
  const screenOptions = useTabScreenOptions();
  const changePasswordOptions =
    process.env.EXPO_OS === "ios"
      ? {
          presentation: "formSheet" as const,
          sheetAllowedDetents: "fitToContents" as const,
          sheetGrabberVisible: true,
          headerLargeTitle: false,
          headerTransparent: false,
          headerBlurEffect: "none" as const,
          unstable_headerRightItems: () => [],
        }
      : {
          presentation: "modal" as const,
          headerLargeTitle: false,
          headerTransparent: false,
          headerBlurEffect: "none" as const,
          unstable_headerRightItems: () => [],
        };

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="change-password" options={changePasswordOptions} />
    </Stack>
  );
}
