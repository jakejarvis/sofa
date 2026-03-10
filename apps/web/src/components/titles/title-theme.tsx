import { useEffect } from "react";

const THEME_PROPERTIES = [
  "--primary",
  "--ring",
  "--primary-foreground",
  "--status-watching",
] as const;

export function TitleTheme({ style }: { style: Record<string, string> }) {
  useEffect(() => {
    const root = document.documentElement;
    const entries = THEME_PROPERTIES.filter((key) => key in style);

    for (const key of entries) {
      root.style.setProperty(key, style[key]);
    }

    return () => {
      for (const key of entries) {
        root.style.removeProperty(key);
      }
    };
  }, [style]);

  return null;
}
