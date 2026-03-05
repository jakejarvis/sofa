"use client";

import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect } from "react";

export default function PagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[pages error boundary]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      {/* Icon ring */}
      <div className="flex size-14 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5 text-destructive">
        <IconAlertTriangle className="size-6" strokeWidth={1.5} />
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          An unexpected error occurred while loading this page. You can try
          again or head back to the dashboard.
        </p>
      </div>

      {error.digest && (
        <p className="font-mono text-[11px] text-muted-foreground/40">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-shadow hover:shadow-lg hover:shadow-primary/20"
        >
          <IconRefresh className="size-4" />
          <span className="relative z-10">Try again</span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
