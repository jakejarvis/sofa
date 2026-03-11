import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { colors } from "@/constants/colors";
import { authClient } from "@/lib/auth-client";
import { hasStoredServerUrl } from "@/lib/server-url";
import * as Haptics from "@/utils/haptics";

export default function TabLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (!process.env.EXPO_PUBLIC_SERVER_URL && !hasStoredServerUrl()) {
    return <Redirect href="/(auth)/server-url" />;
  }
  if (isPending) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <NativeTabs
      iconColor={{
        default: colors.mutedForeground,
        selected: colors.primary,
      }}
      labelStyle={{
        default: { color: colors.mutedForeground },
        selected: { color: colors.primary },
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
