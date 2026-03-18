import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ScrollView } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeIn } from "react-native-reanimated";

import { SofaLogo } from "@/components/ui/sofa-logo";
import { Text } from "@/components/ui/text";

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  logoStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function AuthScreen({ title, subtitle, logoStyle, children }: AuthScreenProps) {
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: 42,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        className="bg-background"
      >
        <Animated.View entering={FadeIn.duration(400)} className="mb-4 items-center">
          {logoStyle ? (
            <Animated.View style={logoStyle}>
              <SofaLogo size={48} />
            </Animated.View>
          ) : (
            <SofaLogo size={48} />
          )}
          <Text maxFontSizeMultiplier={1.3} className="font-display text-foreground mt-1 text-3xl">
            {title}
          </Text>
          {subtitle && <Text className="text-muted-foreground mt-2 text-sm">{subtitle}</Text>}
        </Animated.View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
