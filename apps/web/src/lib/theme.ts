import type { ColorPalette } from "@sofa/api/schemas";
import { hexToRelativeLuminance } from "@sofa/api/utils";

export { hexToRelativeLuminance } from "@sofa/api/utils";

export function getThemeCssProperties(palette: ColorPalette | null): React.CSSProperties {
  const color = palette?.vibrant;
  if (!color) return {};

  const luminance = hexToRelativeLuminance(color);
  const foreground =
    luminance > 0.3
      ? "oklch(0.13 0.006 55)" // dark (current --primary-foreground)
      : "oklch(0.93 0.015 80)"; // light (current --foreground)

  return {
    "--primary": color,
    "--ring": color,
    "--primary-foreground": foreground,
    "--status-watching": color,
  } as React.CSSProperties;
}
