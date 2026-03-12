import { useRouter } from "expo-router";
import { Alert, Pressable, View } from "react-native";
import * as DropdownMenu from "zeego/dropdown-menu";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import * as Haptics from "@/utils/haptics";

export function HeaderAvatar() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  if (!session?.user) return null;

  const { user } = session;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <View className="size-8 overflow-hidden rounded-full">
            {user.image ? (
              <Image
                source={{ uri: user.image }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-primary/[0.08]">
                <Text className="font-sans-medium text-[13px] text-primary">
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
          onSelect={() => router.navigate("/(tabs)/(settings)")}
        >
          <DropdownMenu.ItemIcon
            ios={{ name: "gear" }}
            androidIconName="ic_menu_preferences"
          />
          <DropdownMenu.ItemTitle>Settings</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Item
          key="sign-out"
          destructive
          onSelect={() => {
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Out",
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
          <DropdownMenu.ItemTitle>Sign Out</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
