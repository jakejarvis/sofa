import { toast as burntToast } from "burnt";

type ToastOptions = {
  description?: string;
  duration?: number;
};

function show(
  preset: "done" | "error" | "none",
  haptic: "success" | "warning" | "error" | "none",
  message: string,
  options?: ToastOptions,
) {
  burntToast({
    title: message,
    message: options?.description,
    preset,
    haptic,
    duration: options?.duration ? options.duration / 1000 : 4,
    from: "bottom",
  });
}

export const toast = {
  success: (message: string, options?: ToastOptions) => show("done", "success", message, options),
  error: (message: string, options?: ToastOptions) => show("error", "error", message, options),
  info: (message: string, options?: ToastOptions) => show("none", "none", message, options),
  warning: (message: string, options?: ToastOptions) => show("none", "warning", message, options),
};
