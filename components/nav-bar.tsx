"use client";

import { IconLogout, IconSearch, IconSettings } from "@tabler/icons-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useKeyboard } from "@/components/keyboard-provider";
import { SofaLogo } from "@/components/sofa-logo";
import { Kbd } from "@/components/ui/kbd";
import { signOut, useSession } from "@/lib/auth/client";

const navLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/explore", label: "Explore" },
] as const;

export function NavBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { setCommandPaletteOpen } = useKeyboard();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-foreground transition-colors hover:text-primary"
          >
            <SofaLogo size={28} />
          </Link>
          {session?.user && (
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
          )}
        </div>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              {/* Search trigger pill */}
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="hidden items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/20 hover:bg-card sm:inline-flex"
              >
                <IconSearch size={14} />
                <span>Search...</span>
                <Kbd className="ml-1">⌘K</Kbd>
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-border/30 px-2.5 py-1">
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {session.user.name}
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
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-8 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:shadow-md hover:shadow-primary/20"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
