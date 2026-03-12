import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useCSSVariable } from "uniwind";
import { authClient } from "@/lib/auth-client";
import { hasStoredServerUrl } from "@/lib/server-url";
import * as Haptics from "@/utils/haptics";

export default function TabLayout() {
  const { data: session, isPending } = authClient.useSession();

  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;

  if (!process.env.EXPO_PUBLIC_SERVER_URL && !hasStoredServerUrl()) {
    return <Redirect href="/(auth)/server-url" />;
  }
  if (isPending) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

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
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(explore)">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="safari" md="explore" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(search)" role="search" />
      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
