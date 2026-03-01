"use client";

import { IconHome, IconSearch, IconUser } from "@tabler/icons-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth/client";

const tabs = [
  { href: "/dashboard", label: "Home", icon: IconHome },
  { href: "/search", label: "Search", icon: IconSearch },
] as const;

export function MobileTabBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (!session?.user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl sm:hidden">
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
                size={20}
                className={isActive ? "text-primary" : "text-muted-foreground"}
              />
              <span
                className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}
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
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/");
            router.refresh();
          }}
          className="flex flex-1 flex-col items-center justify-center gap-0.5"
        >
          <IconUser size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">
            {session.user.name?.split(" ")[0] ?? "Account"}
          </span>
        </button>
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
