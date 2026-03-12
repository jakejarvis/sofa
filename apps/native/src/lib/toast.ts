type ToastType = "success" | "error" | "info" | "warning";

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: ToastAction;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration: number;
  action?: ToastAction;
}

let queue: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getSnapshot(): ToastItem[] {
  return queue;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function addToast(type: ToastType, message: string, options?: ToastOptions) {
  const item: ToastItem = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type,
    message,
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
  };
  queue = [...queue, item];
  emit();
}

export function dismiss(id: string) {
  queue = queue.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    addToast("success", message, options),
  error: (message: string, options?: ToastOptions) =>
    addToast("error", message, options),
  info: (message: string, options?: ToastOptions) =>
    addToast("info", message, options),
  warning: (message: string, options?: ToastOptions) =>
    addToast("warning", message, options),
};
