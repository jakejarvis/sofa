import { useEffect, useSyncExternalStore } from "react";

import { ToastView } from "@/components/ui/toast";
import * as Haptics from "@/utils/haptics";
import { dismiss, getSnapshot, subscribe } from "@/utils/toast";

const hapticMap = {
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  info: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
} as const;

export function ToastProvider() {
  const queue = useSyncExternalStore(subscribe, getSnapshot);
  const activeToast = queue[0];

  const activeId = activeToast?.id;
  const activeType = activeToast?.type;
  const activeDuration = activeToast?.duration;

  useEffect(() => {
    if (!activeId || !activeType || activeDuration == null) return;

    hapticMap[activeType]();

    const timer = setTimeout(() => {
      dismiss(activeId);
    }, activeDuration);

    return () => clearTimeout(timer);
  }, [activeId, activeType, activeDuration]);

  if (!activeToast) return null;

  return (
    <ToastView key={activeToast.id} toast={activeToast} onDismiss={dismiss} />
  );
}
