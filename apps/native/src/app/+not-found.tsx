import { IconAlertTriangle } from "@tabler/icons-react-native";
import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Container } from "@/components/container";
import { Button, ButtonLabel } from "@/components/ui/button";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Container>
        <View className="flex-1 items-center justify-center p-4">
          <Animated.View
            entering={FadeIn.duration(400)}
            className="items-center"
          >
            <IconAlertTriangle size={48} color={colors.mutedForeground} />
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 20,
                color: colors.foreground,
                marginTop: 12,
              }}
            >
              Page Not Found
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.mutedForeground,
                textAlign: "center",
                marginTop: 4,
                marginBottom: 16,
              }}
            >
              The page you're looking for doesn't exist.
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <Link href="/" asChild>
              <Button size="sm" style={{ backgroundColor: colors.primary }}>
                <ButtonLabel style={{ color: colors.primaryForeground }}>
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
