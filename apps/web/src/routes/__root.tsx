import { IconAlertTriangle } from "@tabler/icons-react";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Provider as StoreProvider } from "jotai";
import { MotionConfig } from "motion/react";
import { ProgressProvider } from "@/components/navigation-progress";
import { SofaLogo } from "@/components/sofa-logo";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { orpc } from "@/lib/orpc/client";
import globalsCss from "@/styles/globals.css?url";

export const Route = createRootRouteWithContext<{
  orpc: typeof orpc;
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { name: "theme-color", content: "#090706" },
      { title: "Sofa" },
      { name: "description", content: "Track your movies and TV shows" },
    ],
    links: [
      { rel: "stylesheet", href: globalsCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-icon.png" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: GlobalNotFound,
  errorComponent: GlobalError,
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <StoreProvider>
        <MotionConfig reducedMotion="user">
          <ProgressProvider>
            <TooltipProvider>
              <Outlet />
            </TooltipProvider>
          </ProgressProvider>
          <Toaster position="bottom-right" />
        </MotionConfig>
      </StoreProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}

function GlobalNotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute top-[40%] left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/4 blur-[160px]" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <h1
          className="animate-stagger-item font-display text-[8rem] text-foreground/[0.06] leading-[0.85] tracking-tight sm:text-[11rem] md:text-[14rem]"
          style={{ "--stagger-index": 0 } as React.CSSProperties}
        >
          404
        </h1>
        <div
          className="animate-stagger-item space-y-3"
          style={{ "--stagger-index": 1 } as React.CSSProperties}
        >
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            Scene not found
          </h2>
          <p className="mx-auto max-w-sm text-muted-foreground text-sm leading-relaxed">
            This page was left on the cutting room floor. It may have been
            moved, removed, or never made it past the screenplay.
          </p>
        </div>
        <div
          className="mt-8 flex animate-stagger-item items-center gap-3"
          style={{ "--stagger-index": 2 } as React.CSSProperties}
        >
          <a
            href="/"
            className="group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-lg bg-primary px-6 font-medium text-primary-foreground text-sm transition-shadow hover:shadow-lg hover:shadow-primary/20"
          >
            <span className="relative z-10">Return home</span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        </div>
        <div
          className="mt-16 animate-stagger-item text-muted-foreground/20"
          style={{ "--stagger-index": 3 } as React.CSSProperties}
        >
          <SofaLogo className="size-8" />
        </div>
      </div>
    </div>
  );
}

function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5 text-destructive">
        <IconAlertTriangle className="size-6" strokeWidth={1.5} />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mx-auto max-w-sm text-muted-foreground text-sm leading-relaxed">
          An unexpected error occurred while loading this page. You can try
          again or head back to the dashboard.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-5 font-medium text-primary-foreground text-sm transition-shadow hover:shadow-lg hover:shadow-primary/20"
        >
          <span className="relative z-10">Try again</span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
        <a
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-5 font-medium text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          Dashboard
        </a>
      </div>
    </div>
  );
}
