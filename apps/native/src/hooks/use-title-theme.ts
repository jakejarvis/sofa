import type { ColorPalette } from "@sofa/api/schemas";
import { useEffect } from "react";
import { Uniwind } from "uniwind";

function hexToRelativeLuminance(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const DEFAULTS: Record<string, string> = {
  "--color-primary": "oklch(0.8 0.14 65)",
  "--color-ring": "oklch(0.8 0.14 65)",
  "--color-primary-foreground": "oklch(0.13 0.006 55)",
  "--color-status-watching": "oklch(0.78 0.14 65)",
};

export function useTitleTheme(palette: ColorPalette | null | undefined): void {
  useEffect(() => {
    const color = palette?.vibrant;
    if (!color) return;

    const luminance = hexToRelativeLuminance(color);
    const foreground =
      luminance > 0.3 ? "oklch(0.13 0.006 55)" : "oklch(0.93 0.015 80)";

    Uniwind.updateCSSVariables("dark", {
      "--color-primary": color,
      "--color-ring": color,
      "--color-primary-foreground": foreground,
      "--color-status-watching": color,
    });

    return () => {
      Uniwind.updateCSSVariables("dark", DEFAULTS);
    };
  }, [palette?.vibrant]);
}
