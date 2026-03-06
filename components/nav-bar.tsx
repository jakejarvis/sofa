"use client";

import { IconLogout, IconSearch, IconSettings } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SofaLogo } from "@/components/sofa-logo";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:gap-0 sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/dashboard"
            className="shrink-0 text-foreground transition-colors hover:text-primary"
          >
            <SofaLogo className="size-7" />
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

        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-1">
          {/* Mobile search trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/20 hover:bg-card sm:hidden"
          >
            <IconSearch aria-hidden={true} className="size-3.5" />
            <span>Search…</span>
          </button>
          {/* Desktop search trigger pill */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/20 hover:bg-card sm:inline-flex"
          >
            <IconSearch aria-hidden={true} className="size-3.5" />
            <span>Search…</span>
            <Kbd className="ml-1">⌘K</Kbd>
          </button>
          <Separator
            orientation="vertical"
            className="mx-1.5 hidden h-4 bg-border/50 sm:block"
          />
          <Tooltip>
            <TooltipTrigger
              render={<Link href="/settings" />}
              className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm leading-none text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              {session?.user?.name}
              <IconSettings aria-hidden={true} className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              onClick={async () => {
                await signOut();
                router.push("/");
                router.refresh();
              }}
              aria-label="Sign out"
              className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              <IconLogout className="size-[15px]" />
            </TooltipTrigger>
            <TooltipContent>Log out</TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </header>
  );
}
