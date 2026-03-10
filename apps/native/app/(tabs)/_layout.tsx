import {
  IconCompass,
  IconHome,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react-native";
import { Redirect, Tabs } from "expo-router";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { authClient } from "@/lib/auth-client";

export default function TabLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontFamily: fonts.sansMedium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <IconHome size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(explore)"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <IconCompass size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(search)"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <IconSearch size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <IconSettings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
