"use client";

import {
  type MotionStyle,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

interface TiltConfig {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  glareMaxOpacity?: number;
  parallaxShift?: number;
  spring?: { stiffness: number; damping: number; mass: number };
}

const defaults = {
  maxTilt: 8,
  perspective: 800,
  scale: 1.02,
  glareMaxOpacity: 0.15,
  parallaxShift: 5,
  spring: { stiffness: 300, damping: 30, mass: 0.5 },
} satisfies Required<TiltConfig>;

export function useTiltEffect(config: TiltConfig = {}) {
  const opts = { ...defaults, ...config };
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setDisabled(mql.matches);
    const handler = (e: MediaQueryListEvent) => setDisabled(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Normalized mouse position [0,1], center = 0.5
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const isHovered = useMotionValue(0);

  // Rotation (mouse left -> tilt right for natural feel)
  const rawRotateY = useTransform(
    mouseX,
    [0, 1],
    [opts.maxTilt, -opts.maxTilt],
  );
  const rawRotateX = useTransform(
    mouseY,
    [0, 1],
    [-opts.maxTilt, opts.maxTilt],
  );
  const rawScale = useTransform(isHovered, [0, 1], [1, opts.scale]);

  // Springs
  const rotateX = useSpring(rawRotateX, opts.spring);
  const rotateY = useSpring(rawRotateY, opts.spring);
  const scale = useSpring(rawScale, opts.spring);
  const hoverSpring = useSpring(isHovered, opts.spring);

  // Parallax image offset (opposite direction)
  const imageX = useSpring(
    useTransform(mouseX, [0, 1], [opts.parallaxShift, -opts.parallaxShift]),
    opts.spring,
  );
  const imageY = useSpring(
    useTransform(mouseY, [0, 1], [opts.parallaxShift, -opts.parallaxShift]),
    opts.spring,
  );

  // Glare
  const glareX = useTransform(mouseX, [0, 1], [0, 100]);
  const glareY = useTransform(mouseY, [0, 1], [0, 100]);
  const glareOpacity = useTransform(
    hoverSpring,
    [0, 1],
    [0, opts.glareMaxOpacity],
  );
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.25) 0%, transparent 60%)`;

  function onMouseMove(e: React.MouseEvent) {
    if (disabled || !rectRef.current) return;
    const rect = rectRef.current;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(Math.max(0, Math.min(1, x)));
    mouseY.set(Math.max(0, Math.min(1, y)));
  }

  function onMouseEnter() {
    if (disabled) return;
    rectRef.current = ref.current?.getBoundingClientRect() ?? null;
    isHovered.set(1);
  }

  function onMouseLeave() {
    if (disabled) return;
    mouseX.set(0.5);
    mouseY.set(0.5);
    isHovered.set(0);
    rectRef.current = null;
  }

  const containerStyle: MotionStyle = disabled
    ? {}
    : { transformPerspective: opts.perspective, rotateX, rotateY, scale };

  const imageStyle: MotionStyle = disabled ? {} : { x: imageX, y: imageY };

  return {
    ref,
    containerStyle,
    imageStyle,
    glareBackground,
    glareOpacity,
    handlers: { onMouseMove, onMouseEnter, onMouseLeave },
    disabled,
  };
}
