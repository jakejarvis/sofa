import { useLingui } from "@lingui/react/macro";
import * as Haptics from "expo-haptics";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useCSSVariable } from "uniwind";

export function NativeTabBar() {
  const { t } = useLingui();
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;

  return (
    <NativeTabs
      iconColor={{
        default: mutedFgColor,
        selected: primaryColor,
      }}
      labelStyle={{
        default: { color: mutedFgColor },
        selected: { color: primaryColor },
      }}
      screenListeners={() => ({
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      })}
    >
      <NativeTabs.Trigger name="(home)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Home`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(library)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Library`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="books.vertical" md="local_library" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(explore)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Explore`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="safari" md="explore" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Settings`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(search)" role="search" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>{t`Search`}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
