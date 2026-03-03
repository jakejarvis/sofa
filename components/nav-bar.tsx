"use client";

import { IconLogout, IconSearch, IconSettings } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SofaLogo } from "@/components/sofa-logo";
import { Kbd } from "@/components/ui/kbd";
import { commandPaletteOpenAtom } from "@/lib/atoms/command-palette";
import { signOut, useSession } from "@/lib/auth/client";

const navLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/explore", label: "Explore" },
] as const;

export function NavBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const setCommandPaletteOpen = useSetAtom(commandPaletteOpenAtom);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-5 px-4 sm:gap-0 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/dashboard"
            className="shrink-0 text-foreground transition-colors hover:text-primary"
          >
            <SofaLogo size={28} />
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-x-2 -bottom-[11px] h-0.5 rounded-full bg-primary"
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
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
          {/* Mobile search trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/20 hover:bg-card sm:hidden"
          >
            <IconSearch size={14} />
            <span>Search...</span>
          </button>
          {/* Desktop search trigger pill */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/20 hover:bg-card sm:inline-flex"
          >
            <IconSearch size={14} />
            <span>Search...</span>
            <Kbd className="ml-1">⌘K</Kbd>
          </button>
          <div className="hidden items-center gap-2 rounded-lg border border-border/30 px-2.5 py-1 sm:flex">
            <span className="text-sm text-muted-foreground">
              {session?.user?.name}
            </span>
            <Link
              href="/settings"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <IconSettings size={14} />
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/");
                router.refresh();
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <IconLogout size={14} />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
