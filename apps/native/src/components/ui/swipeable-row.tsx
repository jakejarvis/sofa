import { IconTrash } from "@tabler/icons-react-native";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import * as Haptics from "@/utils/haptics";

const ACTION_WIDTH = 80;

function RightAction({ drag }: { drag: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(drag.value, [0, -ACTION_WIDTH], [0.6, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { transform: [{ scale }] };
  });

  return (
    <View
      className="items-center justify-center bg-destructive"
      style={{ width: ACTION_WIDTH }}
    >
      <Animated.View style={animatedStyle}>
        <IconTrash size={22} color="#fff" />
      </Animated.View>
    </View>
  );
}

interface SwipeableRowProps extends PropsWithChildren {
  onDelete: () => void;
}

export function SwipeableRow({ onDelete, children }: SwipeableRowProps) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, drag) => <RightAction drag={drag} />}
      onSwipeableOpen={(direction) => {
        if (direction === "left") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onDelete();
        }
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
