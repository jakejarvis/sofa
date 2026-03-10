import {
  IconCompass,
  IconHome,
  IconLogout,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { SofaLogo } from "@/components/sofa-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

/** Horizontal inset (px) of the desktop indicator within each link (Tailwind `inset-x-2`). */
const DESKTOP_INDICATOR_INSET = 8;
/** Width (px) of the mobile indicator bar (Tailwind `w-8` = 2rem). */
const MOBILE_INDICATOR_WIDTH = 32;

const springTransition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
} as const;

const navLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/explore", label: "Explore" },
] as const;

const mobileTabs = [
  { href: "/dashboard", label: "Home", icon: IconHome },
  { href: "/explore", label: "Explore", icon: IconCompass },
  { href: "/settings", label: "Settings", icon: IconSettings },
] as const;

function isLinkActive(pathname: string, href: string) {
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === "/dashboard" && pathname === "/")
  );
}

function measureDesktopIndicator(itemRect: DOMRect, containerRect: DOMRect) {
  return {
    left: itemRect.left - containerRect.left + DESKTOP_INDICATOR_INSET,
    width: itemRect.width - DESKTOP_INDICATOR_INSET * 2,
  };
}

function measureMobileIndicator(itemRect: DOMRect, containerRect: DOMRect) {
  const center = itemRect.left + itemRect.width / 2 - containerRect.left;
  return center - MOBILE_INDICATOR_WIDTH / 2;
}

/**
 * Tracks the active navigation item's position, recalculating on resize
 * and visibility changes across breakpoints.
 */
function useActiveIndicator<T>(
  activeIndex: number,
  containerRef: React.RefObject<HTMLElement | null>,
  itemRefs: React.MutableRefObject<(HTMLElement | null)[]>,
  measure: (itemRect: DOMRect, containerRect: DOMRect) => T,
): { value: T | null; instant: boolean } {
  const [value, setValue] = useState<T | null>(null);
  const instantRef = useRef(true);

  useLayoutEffect(() => {
    instantRef.current = false;
    const update = () => {
      if (activeIndex === -1) {
        setValue(null);
        return;
      }
      const item = itemRefs.current[activeIndex];
      const container = containerRef.current;
      if (item && container && container.offsetWidth > 0) {
        setValue(
          measure(
            item.getBoundingClientRect(),
            container.getBoundingClientRect(),
          ),
        );
      } else {
        setValue(null);
      }
    };
    update();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      instantRef.current = true;
      update();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeIndex, containerRef, itemRefs, measure]);

  return { value, instant: instantRef.current };
}

export function NavBar({
  userName,
  userEmail,
  userImage,
  userRole,
}: {
  userName: string;
  userEmail: string;
  userImage?: string;
  userRole?: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const setCommandPaletteOpen = useSetAtom(commandPaletteOpenAtom);

  const initial = userName?.charAt(0).toUpperCase() ?? "?";

  const activeIndex = navLinks.findIndex((link) =>
    isLinkActive(pathname, link.href),
  );
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const { value: indicator, instant: desktopInstant } = useActiveIndicator(
    activeIndex,
    navRef,
    linkRefs,
    measureDesktopIndicator,
  );

  return (
    <header className="sticky top-0 z-50 border-border/50 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-5 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:gap-0 sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/dashboard"
            className="shrink-0 text-foreground transition-colors hover:text-primary"
          >
            <SofaLogo className="size-7" />
          </Link>
          <nav
            ref={navRef}
            aria-label="Primary"
            className="relative hidden items-center gap-1 sm:flex"
          >
            {navLinks.map((link, i) => {
              const isActive = isLinkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  ref={(el) => {
                    linkRefs.current[i] = el;
                  }}
                  to={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className="relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {link.label}
                </Link>
              );
            })}
            {indicator && (
              <motion.div
                className="absolute -bottom-[11px] h-0.5 rounded-full bg-primary"
                initial={false}
                animate={{ left: indicator.left, width: indicator.width }}
                transition={desktopInstant ? { duration: 0 } : springTransition}
              />
            )}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-1">
          {/* Mobile search trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/20 hover:bg-card sm:hidden"
          >
            <IconSearch aria-hidden={true} className="size-3.5" />
            <span>Search…</span>
          </button>
          {/* Desktop search trigger pill */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/20 hover:bg-card sm:inline-flex"
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
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className="hidden cursor-pointer rounded-full outline-none ring-2 ring-transparent transition-all hover:ring-primary/40 focus-visible:ring-primary/60 sm:block"
              aria-label="Account menu"
            >
              <Avatar>
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback className="bg-primary/10 font-display text-primary text-xs">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56">
              <div className="flex items-center gap-3 px-2 py-2.5">
                <Avatar className="size-9">
                  <AvatarImage src={userImage} alt={userName} />
                  <AvatarFallback className="bg-primary/10 font-display text-primary text-sm">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground text-sm leading-tight">
                    {userName}
                    {userRole === "admin" && (
                      <Badge className="mb-0.5 ml-1.5 rounded-md border-0 bg-primary/10 align-middle text-primary">
                        Admin
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {userEmail}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link to="/settings" />}
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
                  void navigate({ to: "/" });
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
            to="/settings"
            className="rounded-full ring-2 ring-transparent transition-all hover:ring-primary/40 sm:hidden"
            aria-label="Settings"
          >
            <Avatar size="sm">
              <AvatarImage src={userImage} alt={userName} />
              <AvatarFallback className="bg-primary/10 font-display text-[10px] text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const { pathname } = useLocation();

  const activeIndex = mobileTabs.findIndex((tab) =>
    isLinkActive(pathname, tab.href),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const { value: indicatorLeft, instant: mobileInstant } = useActiveIndicator(
    activeIndex,
    containerRef,
    tabRefs,
    measureMobileIndicator,
  );

  return (
    <nav
      aria-label="Primary"
      className="fixed right-0 bottom-0 left-0 z-50 border-border/50 border-t bg-background/90 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] backdrop-blur-xl sm:hidden"
    >
      <div ref={containerRef} className="relative flex h-14 items-stretch">
        {mobileTabs.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = isLinkActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              to={tab.href}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 focus-visible:text-foreground focus-visible:outline-none"
            >
              <Icon
                className={`size-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
              />
              <span
                className={`font-medium text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
        {indicatorLeft !== null && (
          <motion.div
            className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
            initial={false}
            animate={{ left: indicatorLeft }}
            transition={mobileInstant ? { duration: 0 } : springTransition}
          />
        )}
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
