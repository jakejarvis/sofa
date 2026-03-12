import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
} from "@tabler/icons-react-native";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useCSSVariable } from "uniwind";

import { Text } from "@/components/ui/text";
import type { ToastItem } from "@/lib/toast";

const DISMISS_THRESHOLD = 50;

const iconMap = {
  success: IconCircleCheck,
  error: IconAlertOctagon,
  warning: IconAlertTriangle,
  info: IconInfoCircle,
} as const;

const colorVarMap = {
  success: "--color-status-completed",
  error: "--color-destructive",
  warning: "--color-primary",
  info: "--color-muted-foreground",
} as const;

interface ToastViewProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export function ToastView({ toast, onDismiss }: ToastViewProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);

  const Icon = iconMap[toast.type];
  const iconColor = useCSSVariable(colorVarMap[toast.type]);

  const handleDismiss = () => {
    onDismiss(toast.id);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationY) > DISMISS_THRESHOLD) {
        const target = e.translationY > 0 ? 200 : -200;
        translateY.value = withTiming(target, { duration: 200 }, () => {
          scheduleOnRN(handleDismiss);
        });
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(Math.abs(translateY.value), [0, 100], [1, 0]),
  }));

  return (
    <Animated.View
      entering={SlideInDown.duration(350)}
      exiting={SlideOutDown.duration(200)}
      style={{
        position: "absolute",
        bottom: insets.bottom + 4,
        left: 0,
        right: 0,
        zIndex: 200,
      }}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={animatedStyle}>
          <View
            className="mx-4 flex-row items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            style={{ borderCurve: "continuous" }}
          >
            <Icon size={18} color={iconColor as string} />

            <View className="flex-1 gap-0.5">
              <Text className="font-sans-medium text-[14px] text-foreground">
                {toast.message}
              </Text>
              {toast.description ? (
                <Text className="text-[13px] text-muted-foreground">
                  {toast.description}
                </Text>
              ) : null}
            </View>

            {toast.action ? (
              <Pressable
                onPress={() => {
                  toast.action?.onPress();
                  handleDismiss();
                }}
                className="rounded-lg bg-secondary px-3 py-1.5"
                style={{ borderCurve: "continuous" }}
              >
                <Text className="font-sans-medium text-[13px] text-primary">
                  {toast.action.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
