import {
  impactAsync as _impactAsync,
  notificationAsync as _notificationAsync,
  AndroidHaptics,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  performAndroidHapticsAsync,
} from "expo-haptics";

export { ImpactFeedbackStyle, NotificationFeedbackType };

// See https://docs.expo.dev/versions/latest/sdk/haptics/#androidhaptics
const impactStyleToAndroid: Record<ImpactFeedbackStyle, AndroidHaptics> = {
  [ImpactFeedbackStyle.Light]: AndroidHaptics.Clock_Tick,
  [ImpactFeedbackStyle.Medium]: AndroidHaptics.Context_Click,
  [ImpactFeedbackStyle.Heavy]: AndroidHaptics.Long_Press,
  [ImpactFeedbackStyle.Soft]: AndroidHaptics.Keyboard_Tap,
  [ImpactFeedbackStyle.Rigid]: AndroidHaptics.Virtual_Key,
};

const notificationTypeToAndroid: Record<
  NotificationFeedbackType,
  AndroidHaptics
> = {
  [NotificationFeedbackType.Success]: AndroidHaptics.Confirm,
  [NotificationFeedbackType.Warning]: AndroidHaptics.Segment_Tick,
  [NotificationFeedbackType.Error]: AndroidHaptics.Reject,
};

export async function impactAsync(
  style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium,
) {
  if (process.env.EXPO_OS === "ios") {
    return _impactAsync(style);
  }
  if (process.env.EXPO_OS === "android") {
    return performAndroidHapticsAsync(impactStyleToAndroid[style]);
  }
}

export async function notificationAsync(
  type: NotificationFeedbackType = NotificationFeedbackType.Success,
) {
  if (process.env.EXPO_OS === "ios") {
    return _notificationAsync(type);
  }
  if (process.env.EXPO_OS === "android") {
    return performAndroidHapticsAsync(notificationTypeToAndroid[type]);
  }
}
