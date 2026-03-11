import {
  impactAsync as _impactAsync,
  notificationAsync as _notificationAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "expo-haptics";

export { ImpactFeedbackStyle, NotificationFeedbackType };

export async function impactAsync(
  style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium,
) {
  if (process.env.EXPO_OS === "ios") {
    return _impactAsync(style);
  }
}

export async function notificationAsync(
  type: NotificationFeedbackType = NotificationFeedbackType.Success,
) {
  if (process.env.EXPO_OS === "ios") {
    return _notificationAsync(type);
  }
}
