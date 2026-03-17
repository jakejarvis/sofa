import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useState } from "react";
import { useCSSVariable } from "uniwind";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

const tabTitles: Record<string, string> = {
  "(home)": "Home",
  "(explore)": "Explore",
  "(search)": "Search",
  "(settings)": "Settings",
};

export function NativeTabBar() {
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;
  const [activeTitle, setActiveTitle] = useState("Home");
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";
  const updateCheck = useQuery({
    ...orpc.admin.updateCheck.queryOptions(),
    enabled: isAdmin,
    staleTime: 10 * 60 * 1000,
  });
  const showSettingsBadge = !!updateCheck.data?.updateCheck?.updateAvailable;

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
        <NativeTabs.Trigger name="(home)" disableTransparentOnScrollEdge>
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(explore)" disableTransparentOnScrollEdge>
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="safari" md="explore" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(settings)" disableTransparentOnScrollEdge>
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="gear" md="settings" />
          {showSettingsBadge ? (
            <NativeTabs.Trigger.Badge>!</NativeTabs.Trigger.Badge>
          ) : null}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          name="(search)"
          role="search"
          disableTransparentOnScrollEdge
        >
          <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
