import { useEffect } from "react";
import { Uniwind } from "uniwind";

import type { ColorPalette } from "@sofa/api/schemas";
import { hexToRelativeLuminance } from "@sofa/api/utils";

export function useTitleTheme(palette: ColorPalette | null | undefined): void {
  const vibrant = palette?.vibrant ?? null;

  useEffect(() => {
    if (!vibrant) return;

    const luminance = hexToRelativeLuminance(vibrant);
    const foreground = luminance > 0.3 ? "oklch(0 0 0)" : "oklch(0.93 0.015 80)";

    Uniwind.updateCSSVariables("dark", {
      "--color-title-accent": vibrant,
      "--color-title-accent-foreground": foreground,
    });
  }, [vibrant]);
}
