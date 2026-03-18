import type { ColorPalette } from "@sofa/api/schemas";

/** @internal */
export function hexToRelativeLuminance(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

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
