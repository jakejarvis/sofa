import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background grain texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Warm primary glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />

      <main className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">
            Self-hosted movie & TV tracker
          </p>
          <h1 className="font-display text-6xl tracking-tight sm:text-7xl md:text-8xl">
            Couch Potato
          </h1>
          <p className="mx-auto max-w-md text-lg leading-relaxed text-muted-foreground">
            Track what you watch. Know what&apos;s next.
            <br />
            Your library, your data, your rules.
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-lg bg-primary px-8 font-medium text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20"
          >
            <span className="relative z-10">Sign In</span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-8 font-medium transition-all hover:border-primary/40 hover:bg-primary/5"
          >
            Register
          </Link>
        </div>
      </main>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
