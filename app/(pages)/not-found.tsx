import Link from "next/link";

export default function PagesNotFound() {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      {/* Ghosted 404 */}
      <h1 className="animate-stagger-item font-display text-[6rem] leading-[0.85] tracking-tight text-foreground/[0.06] sm:text-[8rem]">
        404
      </h1>

      <div
        className="animate-stagger-item -mt-4 space-y-2"
        style={{ "--stagger-index": 1 } as React.CSSProperties}
      >
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
          Page not found
        </h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          This page doesn&apos;t exist or may have been moved. Try searching for
          what you&apos;re looking for instead.
        </p>
      </div>

      <div
        className="animate-stagger-item flex items-center gap-3"
        style={{ "--stagger-index": 2 } as React.CSSProperties}
      >
        <Link
          href="/dashboard"
          className="group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-shadow hover:shadow-lg hover:shadow-primary/20"
        >
          <span className="relative z-10">Dashboard</span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <Link
          href="/explore"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          Explore
        </Link>
      </div>
    </div>
  );
}
