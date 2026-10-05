import { useLingui } from "@lingui/react/macro";
import { NativeTabs, type NativeTabsProps } from "expo-router/unstable-native-tabs";
import { useMemo } from "react";
import { useCSSVariable, useResolveClassNames } from "uniwind";

import * as Haptics from "@/utils/haptics";

export function NativeTabBar() {
  const { t } = useLingui();
  const primaryColor = useCSSVariable("--color-primary") as string;
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const surfaceColor = useCSSVariable("--color-card") as string;
  const rippleColor = useCSSVariable("--color-secondary") as string;
  const labelTextStyle = useResolveClassNames("font-sans text-xs font-medium");

  const screenListeners = useMemo<NativeTabsProps["screenListeners"]>(
    () => ({
      tabPress: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    }),
    [],
  );

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
        default: [labelTextStyle, { color: mutedFgColor }],
        selected: [labelTextStyle, { color: primaryColor }],
      }}
      labelVisibilityMode="labeled"
      rippleColor={rippleColor}
      screenListeners={screenListeners}
    >
      <NativeTabs.Trigger name="(home)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Home`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(library)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Library`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="local_library" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(explore)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Explore`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="explore" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Settings`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(search)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Search`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
