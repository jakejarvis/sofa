import { Icon } from "@expo/ui";
import { MenuView } from "@expo/ui/community/menu";
import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { Alert, Pressable, View } from "react-native";

import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { queryClient } from "@/lib/query-client";
import { authClient } from "@/lib/server";
import * as Haptics from "@/utils/haptics";

const settingsIcon = Icon.select({
  ios: "gear",
  android: import("@expo/material-symbols/settings.xml"),
});
const signOutIcon = Icon.select({
  ios: "rectangle.portrait.and.arrow.right",
  android: import("@expo/material-symbols/logout.xml"),
});

export function HeaderAvatar() {
  const { t } = useLingui();
  const { data: session } = authClient.useSession();
  const { navigate } = useRouter();

  if (!session?.user) return null;

  const { user } = session;

  return (
    <MenuView
      actions={[
        { id: "settings", title: t`Settings`, image: settingsIcon },
        {
          id: "sign-out",
          title: t`Sign out`,
          image: signOutIcon,
          attributes: { destructive: true },
        },
      ]}
      onOpenMenu={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === "settings") {
          navigate("/(tabs)/(settings)");
        } else if (nativeEvent.event === "sign-out") {
          Alert.alert(t`Sign out`, t`Are you sure you want to sign out?`, [
            { text: t`Cancel`, style: "cancel" },
            {
              text: t`Sign out`,
              style: "destructive",
              onPress: () => {
                authClient.signOut();
                queryClient.clear();
              },
            },
          ]);
        }
      }}
    >
      <Pressable
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        accessibilityRole="button"
        accessibilityLabel={t`User menu`}
        hitSlop={8}
      >
        <View className="size-8 overflow-hidden rounded-full" accessible={false}>
          {user.image ? (
            <Image
              source={{ uri: user.image }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              accessible={false}
            />
          ) : (
            <View className="bg-primary/[0.08] flex-1 items-center justify-center">
              <Text
                maxFontSizeMultiplier={1.0}
                className="font-display text-primary text-sm font-medium"
              >
                {user.name?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </MenuView>
  );
}
