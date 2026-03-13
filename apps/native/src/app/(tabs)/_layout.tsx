import { Stack } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useState } from "react";
import { useCSSVariable } from "uniwind";
import * as Haptics from "@/utils/haptics";

const tabTitles: Record<string, string> = {
  "(home)": "Home",
  "(explore)": "Explore",
  "(search)": "Search",
  "(settings)": "Settings",
};

export default function TabLayout() {
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;
  const [activeTitle, setActiveTitle] = useState("Home");

  return (
    <>
      <Stack.Screen options={{ title: activeTitle }} />
      <NativeTabs
        iconColor={{
          default: mutedFgColor,
          selected: primaryColor,
        }}
        labelStyle={{
          default: { color: mutedFgColor },
          selected: { color: primaryColor },
        }}
        screenListeners={({ route }) => ({
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
          focus: () => {
            setActiveTitle(tabTitles[route.name] ?? "Home");
          },
        })}
      >
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(explore)">
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="safari" md="explore" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(settings)">
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="gear" md="settings" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(search)" role="search" />
      </NativeTabs>
    </>
  );
}
