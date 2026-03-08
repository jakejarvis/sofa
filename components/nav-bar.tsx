"use client";

import { IconLogout, IconSearch, IconSettings } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SofaLogo } from "@/components/sofa-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { commandPaletteOpenAtom } from "@/lib/atoms/command-palette";
import { signOut } from "@/lib/auth/client";

const navLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/explore", label: "Explore" },
] as const;

export function NavBar({
  userName,
  userEmail,
  userImage,
}: {
  userName: string;
  userEmail: string;
  userImage?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const setCommandPaletteOpen = useSetAtom(commandPaletteOpenAtom);

  const initial = userName?.charAt(0).toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-50 border-border/50 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-5 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:gap-0 sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]">
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
                  className="relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
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
            className="flex flex-1 items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:border-primary/20 hover:bg-card sm:hidden"
          >
            <IconSearch aria-hidden={true} className="size-3.5" />
            <span>Search…</span>
          </button>
          {/* Desktop search trigger pill */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:border-primary/20 hover:bg-card sm:inline-flex"
          >
            <IconSearch aria-hidden={true} className="size-3.5" />
            <span>Search…</span>
            <Kbd className="ml-2.5">⌘ K</Kbd>
          </button>
          <Separator
            orientation="vertical"
            className="mx-1.5 my-auto hidden h-6 bg-border/50 sm:block"
          />
          {/* User avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="hidden cursor-pointer rounded-full outline-none ring-2 ring-transparent transition-all hover:ring-primary/40 focus-visible:ring-primary/60 sm:block"
              aria-label="Account menu"
            >
              <Avatar>
                {userImage && <AvatarImage src={userImage} alt={userName} />}
                <AvatarFallback className="bg-primary/10 font-display text-primary text-xs">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56">
              <div className="flex items-center gap-3 px-2 py-2.5">
                <Avatar className="size-9">
                  {userImage && <AvatarImage src={userImage} alt={userName} />}
                  <AvatarFallback className="bg-primary/10 font-display text-primary text-sm">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground text-sm leading-tight">
                    {userName}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {userEmail}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/settings" />}
                className="cursor-pointer text-[13px]"
              >
                <IconSettings className="size-3.5" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  await signOut();
                  router.push("/");
                  router.refresh();
                }}
                className="cursor-pointer text-[13px]"
              >
                <IconLogout className="size-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Mobile: simple avatar link to settings */}
          <Link
            href="/settings"
            className="rounded-full ring-2 ring-transparent transition-all hover:ring-primary/40 sm:hidden"
            aria-label="Settings"
          >
            <Avatar size="sm">
              {userImage && <AvatarImage src={userImage} alt={userName} />}
              <AvatarFallback className="bg-primary/10 font-display text-[10px] text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </nav>
    </header>
  );
}
