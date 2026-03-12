import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SofaLogo } from "@/components/ui/sofa-logo";
import { Text } from "@/components/ui/text";

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  logoStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function AuthScreen({
  title,
  subtitle,
  logoStyle,
  children,
}: AuthScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      className="bg-background"
    >
      <Animated.View
        entering={FadeIn.duration(400)}
        className="mb-3 items-center"
      >
        {logoStyle ? (
          <Animated.View style={logoStyle}>
            <SofaLogo size={48} />
          </Animated.View>
        ) : (
          <SofaLogo size={48} />
        )}
        <Text className="mt-1 font-display text-[32px] text-foreground">
          {title}
        </Text>
        {subtitle && (
          <Text className="mt-4 text-muted-foreground text-sm">{subtitle}</Text>
        )}
      </Animated.View>
      {children}
    </ScrollView>
  );
}
