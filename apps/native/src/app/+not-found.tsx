import { Trans } from "@lingui/react/macro";
import { IconAlertTriangle } from "@tabler/icons-react-native";
import { Link, Stack } from "expo-router";
import { View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { Container } from "@/components/container";
import { Button, ButtonLabel } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function NotFoundScreen() {
  const mutedForeground = useCSSVariable("--color-muted-foreground") as string;

  return (
    <>
      <Stack.Screen.Title>
        <Trans>Not Found</Trans>
      </Stack.Screen.Title>
      <Container>
        <View className="flex-1 items-center justify-center p-4">
          <Animated.View entering={FadeIn.duration(400)} className="items-center">
            <IconAlertTriangle size={48} color={mutedForeground} />
            <Text className="font-display text-foreground mt-3 text-xl">
              <Trans>Page Not Found</Trans>
            </Text>
            <Text className="text-muted-foreground mt-1 mb-4 text-center text-sm">
              <Trans>The page you're looking for doesn't exist.</Trans>
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <Link href="/" asChild>
              <Button size="sm" className="bg-primary">
                <ButtonLabel className="text-primary-foreground">
                  <Trans>Go Home</Trans>
                </ButtonLabel>
              </Button>
            </Link>
          </Animated.View>
        </View>
      </Container>
    </>
  );
}
