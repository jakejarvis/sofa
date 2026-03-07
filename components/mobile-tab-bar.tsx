"use client";

import { IconCompass, IconHome, IconSettings } from "@tabler/icons-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Home", icon: IconHome },
  { href: "/explore", label: "Explore", icon: IconCompass },
  { href: "/settings", label: "Settings", icon: IconSettings },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-border/50 border-t bg-background/90 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] backdrop-blur-xl sm:hidden">
      <div className="flex h-14 items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
            >
              <Icon
                className={`size-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
              />
              <span
                className={`font-medium text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
