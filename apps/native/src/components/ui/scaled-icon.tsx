import type { ComponentType } from "react";
import type { SvgProps } from "react-native-svg";

import { useScaledSize } from "@/hooks/use-scaled-size";

interface ScaledIconProps extends SvgProps {
  icon: ComponentType<SvgProps & { size?: number }>;
  size: number;
}

/**
 * Renders an icon scaled proportionally to the system font scale
 * (iOS Dynamic Type / Android font size), capped at 1.5x.
 *
 * Use this for icons that sit inline with text so they grow alongside it.
 */
export function ScaledIcon({ icon: IconComponent, size, ...props }: ScaledIconProps) {
  const scaled = useScaledSize();
  const s = scaled(size);
  return <IconComponent size={s} width={s} height={s} {...props} />;
}
