import { Trans, useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { Alert, Pressable, View } from "react-native";
import * as DropdownMenu from "zeego/dropdown-menu";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { queryClient } from "@/lib/query-client";
import { authClient } from "@/lib/server";
import * as Haptics from "@/utils/haptics";

export function HeaderAvatar() {
  const { t } = useLingui();
  const { data: session } = authClient.useSession();
  const { navigate } = useRouter();

  if (!session?.user) return null;

  const { user } = session;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          accessibilityRole="button"
          accessibilityLabel="User menu"
          hitSlop={8}
        >
          <View
            className="size-8 overflow-hidden rounded-full"
            accessible={false}
          >
            {user.image ? (
              <Image
                source={{ uri: user.image }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                accessible={false}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-primary/[0.08]">
                <Text
                  maxFontSizeMultiplier={1.0}
                  className="font-display font-medium text-primary text-sm"
                >
                  {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Item
          key="settings"
          onSelect={() => navigate("/(tabs)/(settings)")}
        >
          <DropdownMenu.ItemIcon
            ios={{ name: "gear" }}
            androidIconName="ic_menu_preferences"
          />
          <DropdownMenu.ItemTitle>
            <Trans>Settings</Trans>
          </DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Item
          key="sign-out"
          destructive
          onSelect={() => {
            Alert.alert(t`Sign Out`, t`Are you sure you want to sign out?`, [
              { text: t`Cancel`, style: "cancel" },
              {
                text: t`Sign Out`,
                style: "destructive",
                onPress: () => {
                  authClient.signOut();
                  queryClient.clear();
                },
              },
            ]);
          }}
        >
          <DropdownMenu.ItemIcon
            ios={{ name: "rectangle.portrait.and.arrow.right" }}
            androidIconName="ic_menu_close_clear_cancel"
          />
          <DropdownMenu.ItemTitle>
            <Trans>Sign out</Trans>
          </DropdownMenu.ItemTitle>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
