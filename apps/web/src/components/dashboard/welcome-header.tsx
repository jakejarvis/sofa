export function WelcomeHeader({ name }: { name?: string | null }) {
  return (
    <div>
      <h1 className="text-balance font-display text-3xl tracking-tight">
        Welcome back{name ? `, ${name}` : ""}
      </h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Here&apos;s what&apos;s happening with your library
      </p>
    </div>
  );
}
