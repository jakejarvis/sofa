import { Trans, useLingui } from "@lingui/react/macro";
import {
  IconBooks,
  IconCalendarEvent,
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

// navLinks and mobileTabs moved inside components for LingUI

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
  const [state, setState] = useState<{ value: T | null; instant: boolean }>({
    value: null,
    instant: true,
  });

  useLayoutEffect(() => {
    const computeValue = (): T | null => {
      if (activeIndex === -1) return null;
      const item = itemRefs.current[activeIndex];
      const container = containerRef.current;
      if (item && container && container.offsetWidth > 0) {
        return measure(item.getBoundingClientRect(), container.getBoundingClientRect());
      }
      return null;
    };
    // Initial measurement is instant; subsequent activeIndex changes animate
    setState({ value: computeValue(), instant: true });
    // Use microtask to flip instant to false after the synchronous paint
    queueMicrotask(() => setState((prev) => (prev.instant ? { ...prev, instant: false } : prev)));
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      setState({ value: computeValue(), instant: true });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeIndex, containerRef, itemRefs, measure]);

  return state;
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
  const { t } = useLingui();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const setCommandPaletteOpen = useSetAtom(commandPaletteOpenAtom);

  const navLinks = [
    { href: "/dashboard", label: t`Home` },
    { href: "/library", label: t`Library` },
    { href: "/explore", label: t`Explore` },
    { href: "/upcoming", label: t`Upcoming` },
  ] as const;

  const initial = userName?.charAt(0).toUpperCase() ?? "?";

  const activeIndex = navLinks.findIndex((link) => isLinkActive(pathname, link.href));
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const { value: indicator, instant: desktopInstant } = useActiveIndicator(
    activeIndex,
    navRef,
    linkRefs,
    measureDesktopIndicator,
  );

  return (
    <header className="border-border/50 bg-background/80 sticky top-0 z-50 border-b pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-5 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:gap-0 sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/dashboard"
            className="text-foreground hover:text-primary shrink-0 transition-colors"
          >
            <SofaLogo className="size-7" />
          </Link>
          <nav
            ref={navRef}
            aria-label={t`Primary`}
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
                  className="text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:ring-primary/40 relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {link.label}
                </Link>
              );
            })}
            {indicator && (
              <motion.div
                className="bg-primary absolute -bottom-[11px] h-0.5 rounded-full"
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
            className="border-border/50 bg-card/50 text-muted-foreground hover:border-primary/20 hover:bg-card flex flex-1 items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] transition-colors sm:hidden"
          >
            <IconSearch aria-hidden={true} className="size-3.5" />
            <span>{t`Search…`}</span>
          </button>
          {/* Desktop search trigger pill */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="border-border/50 bg-card/50 text-muted-foreground hover:border-primary/20 hover:bg-card hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] transition-colors sm:inline-flex"
          >
            <IconSearch aria-hidden={true} className="size-3.5" />
            <span>{t`Search…`}</span>
            <Kbd className="ms-2.5">⌘ K</Kbd>
          </button>
          <Separator
            orientation="vertical"
            className="bg-border/50 mx-1.5 my-auto hidden h-6 sm:block"
          />
          {/* User avatar dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className="hover:ring-primary/40 focus-visible:ring-primary/60 hidden cursor-pointer rounded-full ring-2 ring-transparent transition-all outline-none sm:block"
              aria-label={t`Account menu`}
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
                  <p className="text-foreground truncate text-sm leading-tight font-medium">
                    {userName}
                    {userRole === "admin" && (
                      <Badge className="bg-primary/10 text-primary ms-1.5 mb-0.5 rounded-md border-0 align-middle">
                        <Trans>Admin</Trans>
                      </Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">{userEmail}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link to="/settings" />}
                className="cursor-pointer text-[13px]"
              >
                <IconSettings className="size-3.5" />
                <Trans>Settings</Trans>
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
                <Trans>Sign out</Trans>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Mobile: simple avatar link to settings */}
          <Link
            to="/settings"
            className="hover:ring-primary/40 rounded-full ring-2 ring-transparent transition-all sm:hidden"
            aria-label={t`Settings`}
          >
            <Avatar size="sm">
              <AvatarImage src={userImage} alt={userName} />
              <AvatarFallback className="bg-primary/10 font-display text-primary text-[10px]">
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
  const { t } = useLingui();
  const { pathname } = useLocation();

  const mobileTabs = [
    { href: "/dashboard", label: t`Home`, icon: IconHome },
    { href: "/library", label: t`Library`, icon: IconBooks },
    { href: "/explore", label: t`Explore`, icon: IconCompass },
    { href: "/upcoming", label: t`Upcoming`, icon: IconCalendarEvent },
    { href: "/settings", label: t`Settings`, icon: IconSettings },
  ] as const;

  const activeIndex = mobileTabs.findIndex((tab) => isLinkActive(pathname, tab.href));
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
      aria-label={t`Primary`}
      className="border-border/50 bg-background/90 fixed right-0 bottom-0 left-0 z-50 border-t ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)] backdrop-blur-xl sm:hidden"
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
              className="focus-visible:text-foreground relative flex flex-1 flex-col items-center justify-center gap-0.5 focus-visible:outline-none"
            >
              <Icon className={`size-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span
                className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
        {indicatorLeft !== null && (
          <motion.div
            className="bg-primary absolute top-0 h-0.5 w-8 rounded-full"
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
