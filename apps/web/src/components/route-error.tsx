import { Trans } from "@lingui/react/macro";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export function RouteError({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <div className="border-destructive/20 bg-destructive/5 text-destructive flex size-14 items-center justify-center rounded-full border">
        <IconAlertTriangle className="size-6" strokeWidth={1.5} />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
          <Trans>Something went wrong</Trans>
        </h1>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
          <Trans>
            An unexpected error occurred while loading this page. You can try again or head back to
            the dashboard.
          </Trans>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="group bg-primary text-primary-foreground hover:shadow-primary/20 relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg px-5 text-sm font-medium transition-shadow hover:shadow-lg"
        >
          <span className="relative z-10">
            <Trans>Try again</Trans>
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
        <Link
          to="/dashboard"
          className="border-border hover:border-primary/40 hover:bg-primary/5 inline-flex h-10 items-center justify-center rounded-lg border px-5 text-sm font-medium transition-colors"
        >
          <Trans>Dashboard</Trans>
        </Link>
      </div>
    </div>
  );
}
