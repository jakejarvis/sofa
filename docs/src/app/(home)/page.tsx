import {
  ArrowRightLeft,
  Container,
  ExternalLinkIcon,
  HardDrive,
  InfoIcon,
  ListChecks,
  MonitorPlay,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { ScrollIndicator } from "@/components/scroll-indicator";
import { SofaLogo } from "@/components/sofa-logo";
import { TmdbLogo } from "@/components/tmdb-logo";

const features = [
  {
    title: "Episode Tracking",
    description:
      "Track progress at the episode level. Pick up any series exactly where you left off.",
    icon: ListChecks,
  },
  {
    title: "Media Server Sync",
    description:
      "Automatically log watches from Plex, Jellyfin, or Emby via webhooks.",
    icon: MonitorPlay,
  },
  {
    title: "Sonarr & Radarr",
    description: "Export your watchlist as import lists for your *arr stack.",
    icon: ArrowRightLeft,
  },
  {
    title: "Self-Hosted",
    description:
      "Your data lives on your server. Single-file database, local image cache, built-in backups.",
    icon: HardDrive,
  },
  {
    title: "Web + Mobile",
    description:
      "Native iOS and Android app alongside the web interface. Same account, synced everywhere.",
    icon: Smartphone,
  },
  {
    title: "One Container",
    description:
      "Deploy with a single Docker image. No external database, no sidecar services.",
    icon: Container,
  },
];

const steps = [
  {
    step: "1",
    title: "Get a TMDB API token",
    content: (
      <p className="text-sm text-fd-muted-foreground">
        Create a free account at{" "}
        <a
          href="https://www.themoviedb.org/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-fd-primary underline underline-offset-4 hover:text-fd-primary/80"
        >
          themoviedb.org
          <ExternalLinkIcon className="size-3 inline-block translate-y-[-2px] text-fd-muted-foreground ml-1" />
        </a>
      </p>
    ),
  },
  {
    step: "2",
    title: "Set three environment variables",
    content: (
      <pre className="overflow-x-auto mt-2 rounded-lg bg-fd-background/80 p-3 text-xs text-fd-muted-foreground ring-1 ring-white/[0.06]">
        <code>{`TMDB_API_READ_ACCESS_TOKEN=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://sofa.example.com`}</code>
      </pre>
    ),
  },
  {
    step: "3",
    title: "Start the container",
    content: (
      <pre className="overflow-x-auto mt-2 rounded-lg bg-fd-background/80 p-3 text-xs text-fd-muted-foreground ring-1 ring-white/[0.06]">
        <code>docker compose up -d</code>
      </pre>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-x-clip">
      {/* Ambient glows — positioned outside hero so they bleed into features */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-[oklch(0.8_0.14_65)] opacity-[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute top-[60vh] -right-24 h-[400px] w-[400px] rounded-full bg-[oklch(0.8_0.14_65)] opacity-[0.04] blur-[100px]" />

      {/* ── Hero ── */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6 pb-16 pt-8 text-center">
        <div className="relative flex max-w-2xl flex-col items-center gap-8">
          <p
            className="animate-stagger-item text-xs font-medium tracking-[0.3em] text-fd-primary uppercase"
            style={{ "--stagger-index": 0 } as React.CSSProperties}
          >
            Self-hosted movie & TV tracker
          </p>

          <div
            className="animate-stagger-item"
            style={{ "--stagger-index": 1 } as React.CSSProperties}
          >
            <SofaLogo className="size-20 text-fd-primary md:size-28" />
          </div>

          <h1
            className="animate-stagger-item font-display text-3xl tracking-tight md:text-5xl"
            style={{ "--stagger-index": 2 } as React.CSSProperties}
          >
            Your watchlist belongs to you.
          </h1>

          <p
            className="animate-stagger-item max-w-md text-base leading-relaxed text-fd-muted-foreground md:text-lg"
            style={{ "--stagger-index": 3 } as React.CSSProperties}
          >
            Sofa lives on your own server and seamlessly plugs into your
            existing home media stack.
          </p>

          <div
            className="animate-stagger-item flex flex-wrap items-center justify-center gap-4"
            style={{ "--stagger-index": 4 } as React.CSSProperties}
          >
            <Link
              href="/docs"
              className="inline-flex h-11 items-center rounded-lg bg-fd-primary px-7 text-sm font-medium text-fd-primary-foreground transition-shadow hover:shadow-lg hover:shadow-fd-primary/20"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/jakejarvis/sofa"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-lg px-7 text-sm font-medium ring-1 ring-fd-border transition-colors hover:bg-fd-accent hover:ring-fd-primary/30"
            >
              GitHub
            </a>
          </div>
        </div>

        <ScrollIndicator />
      </section>

      {/* ── Features ── */}
      <section className="mx-auto w-full max-w-5xl px-6 py-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="animate-stagger-item rounded-xl bg-fd-card/50 p-6 ring-1 ring-white/[0.06]"
              style={{ "--stagger-index": i } as React.CSSProperties}
            >
              <feature.icon className="mb-3 size-5 text-fd-primary" />
              <h3 className="mb-1.5 font-display text-lg">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-fd-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick Start ── */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <h2
          className="animate-stagger-item mb-8 text-center font-display text-2xl md:text-3xl"
          style={{ "--stagger-index": 0 } as React.CSSProperties}
        >
          Deploy in minutes
        </h2>

        <div className="space-y-4">
          {steps.map((s) => (
            <div
              key={s.step}
              className="animate-stagger-item rounded-xl bg-fd-card/50 p-5 ring-1 ring-white/[0.06]"
              style={
                { "--stagger-index": Number(s.step) } as React.CSSProperties
              }
            >
              <div className="flex items-baseline gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-fd-primary text-xs font-semibold text-fd-primary-foreground">
                  {s.step}
                </span>
                <h3 className="font-display text-base">{s.title}</h3>
              </div>
              <div className="mt-2 pl-9">{s.content}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-fd-muted-foreground flex items-center gap-1 mx-auto w-fit">
          <InfoIcon className="size-3 inline-block" />
          The first registered account becomes admin.
        </p>

        <div className="mt-6 text-center">
          <Link
            href="/docs"
            className="text-sm text-fd-primary underline underline-offset-4 hover:text-fd-primary/80"
          >
            Read the full setup guide &rarr;
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-fd-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center text-xs text-fd-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>MIT License</span>
            <span className="hidden sm:inline">&middot;</span>
            <a
              href="https://github.com/jakejarvis/sofa"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground"
            >
              GitHub
            </a>
            <span className="hidden sm:inline">&middot;</span>
            <Link href="/docs" className="hover:text-fd-foreground">
              Docs
            </Link>
          </div>
          <div className="flex flex-col items-center gap-2">
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-85 transition-opacity hover:opacity-100"
            >
              <TmdbLogo className="h-3" />
            </a>
            <p className="max-w-md text-fd-muted-foreground/80">
              This product uses the TMDB API but is not endorsed or certified by
              TMDB.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
