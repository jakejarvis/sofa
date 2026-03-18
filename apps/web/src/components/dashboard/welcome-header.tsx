import { Trans } from "@lingui/react/macro";

export function WelcomeHeader({ name }: { name?: string | null }) {
  return (
    <div>
      <h1 className="text-balance font-display text-3xl tracking-tight">
        {name ? (
          <Trans>Welcome back, {name}</Trans>
        ) : (
          <Trans>Welcome back</Trans>
        )}
      </h1>
      <p className="mt-1 text-muted-foreground text-sm">
        <Trans>Here&apos;s what&apos;s happening with your library</Trans>
      </p>
    </div>
  );
}
