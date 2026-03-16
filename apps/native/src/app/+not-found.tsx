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
      <Stack.Screen.Title>Not Found</Stack.Screen.Title>
      <Container>
        <View className="flex-1 items-center justify-center p-4">
          <Animated.View
            entering={FadeIn.duration(400)}
            className="items-center"
          >
            <IconAlertTriangle size={48} color={mutedForeground} />
            <Text className="mt-3 font-display text-foreground text-xl">
              Page Not Found
            </Text>
            <Text className="mt-1 mb-4 text-center text-muted-foreground text-sm">
              The page you're looking for doesn't exist.
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <Link href="/" asChild>
              <Button size="sm" className="bg-primary">
                <ButtonLabel className="text-primary-foreground">
                  Go Home
                </ButtonLabel>
              </Button>
            </Link>
          </Animated.View>
        </View>
      </Container>
    </>
  );
}
