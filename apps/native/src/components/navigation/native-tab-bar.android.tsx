import {
  NativeTabs,
  type NativeTabsProps,
} from "expo-router/unstable-native-tabs";
import { useMemo } from "react";
import { useCSSVariable, useResolveClassNames } from "uniwind";
import * as Haptics from "@/utils/haptics";

export function NativeTabBar() {
  const primaryColor = useCSSVariable("--color-primary") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const surfaceColor = useCSSVariable("--color-card") as string;
  const rippleColor = useCSSVariable("--color-secondary") as string;

  const screenListeners = useMemo<NativeTabsProps["screenListeners"]>(
    () => ({
      tabPress: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    }),
    [],
  );
  const labelTextStyle = useResolveClassNames("font-medium font-sans text-xs");

  return (
    <NativeTabs
      backgroundColor={surfaceColor}
      disableIndicator
      iconColor={{
        default: mutedFgColor,
        selected: primaryColor,
      }}
      indicatorColor="transparent"
      labelStyle={{
        default: [
          labelTextStyle as Record<string, unknown>,
          { color: mutedFgColor },
        ],
        selected: [
          labelTextStyle as Record<string, unknown>,
          { color: primaryColor },
        ],
      }}
      labelVisibilityMode="labeled"
      rippleColor={rippleColor}
      screenListeners={screenListeners}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(explore)">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="explore" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(search)">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
