import Link from "next/link";
import { SofaLogo } from "@/components/sofa-logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Warm projector glow */}
      <div className="pointer-events-none absolute top-[40%] left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/4 blur-[160px]" />

      {/* Subtle vertical light beam */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 h-[60vh] w-px -translate-x-1/2"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.8 0.14 65 / 0.12), transparent)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Frame counter label */}
        <p
          className="animate-stagger-item font-mono text-[10px] text-muted-foreground/40 uppercase tracking-[0.5em]"
          style={{ "--stagger-index": 0 } as React.CSSProperties}
        >
          Scene not found
        </p>

        {/* Large ghosted 404 */}
        <h1
          className="animate-stagger-item font-display text-[8rem] text-foreground/[0.06] leading-[0.85] tracking-tight sm:text-[11rem] md:text-[14rem]"
          style={{ "--stagger-index": 1 } as React.CSSProperties}
        >
          404
        </h1>

        {/* Message */}
        <div
          className="-mt-2 animate-stagger-item space-y-3 sm:-mt-4"
          style={{ "--stagger-index": 2 } as React.CSSProperties}
        >
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            Lost in the credits
          </h2>
          <p className="mx-auto max-w-sm text-muted-foreground text-sm leading-relaxed">
            This page was left on the cutting room floor. It may have been
            moved, removed, or never made it past the screenplay.
          </p>
        </div>

        {/* Actions */}
        <div
          className="mt-8 flex animate-stagger-item items-center gap-3"
          style={{ "--stagger-index": 3 } as React.CSSProperties}
        >
          <Link
            href="/"
            className="group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-lg bg-primary px-6 font-medium text-primary-foreground text-sm transition-shadow hover:shadow-lg hover:shadow-primary/20"
          >
            <span className="relative z-10">Return home</span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </div>

        {/* Logo watermark */}
        <div
          className="mt-16 animate-stagger-item text-muted-foreground/20"
          style={{ "--stagger-index": 4 } as React.CSSProperties}
        >
          <SofaLogo className="size-8" />
        </div>
      </div>
    </div>
  );
}
