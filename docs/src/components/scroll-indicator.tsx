"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ScrollIndicator() {
  const [shown, setShown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [fits, setFits] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Delayed entrance matching the stagger animation timing
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Hide if the hero content overlaps the indicator position
  useEffect(() => {
    const check = () => {
      if (!ref.current) return;
      const indicatorRect = ref.current.getBoundingClientRect();
      const content = ref.current.previousElementSibling;
      if (!content) return;
      const contentBottom = content.getBoundingClientRect().bottom;
      setFits(contentBottom < indicatorRect.top);
    };

    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 32);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={ref}
      className="text-fd-muted-foreground absolute bottom-9 flex flex-col items-center gap-1.5 transition-opacity duration-500"
      style={{ opacity: shown && !scrolled && fits ? 1 : 0 }}
    >
      <ArrowDown className="animate-scroll-bounce size-7 stroke-2" aria-hidden="true" />
    </div>
  );
}
