import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export function CastCard({
  person,
}: {
  person: {
    id: string;
    name: string;
    character: string | null;
    profilePath: string | null;
  };
}) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.95]) }],
  }));

  return (
    <Link href={`/person/${person.id}` as `/person/${string}`}>
      <Link.Trigger>
        <Pressable
          onPressIn={() =>
            pressed.set(withSpring(1, { damping: 15, stiffness: 300 }))
          }
          onPressOut={() =>
            pressed.set(withSpring(0, { damping: 15, stiffness: 300 }))
          }
        >
          <Animated.View
            style={[
              animatedStyle,
              { width: 80, marginRight: 16, alignItems: "center" },
            ]}
          >
            <View
              className="mb-2 overflow-hidden"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.secondary,
              }}
            >
              {person.profilePath && (
                <Image
                  source={{ uri: person.profilePath }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 11,
                color: colors.foreground,
                textAlign: "center",
              }}
            >
              {person.name}
            </Text>
            {person.character ? (
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 10,
                  color: colors.mutedForeground,
                  textAlign: "center",
                }}
              >
                {person.character}
              </Text>
            ) : null}
          </Animated.View>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
    </Link>
  );
}
