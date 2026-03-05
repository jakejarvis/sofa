export function WelcomeHeader({ name }: { name?: string | null }) {
  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight text-balance">
        Welcome back{name ? `, ${name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Here&apos;s what&apos;s happening with your library
      </p>
    </div>
  );
}
