import Image from "next/image";
import Link from "next/link";

import screenshot from "@/assets/screenshot.png";
import {
  EmbyLogo,
  JellyfinLogo,
  LetterboxdLogo,
  PlexLogo,
  RadarrLogo,
  SimklLogo,
  SonarrLogo,
  TraktLogo,
} from "@/components/integration-logos";
import { cn } from "@/lib/cn";

const highlights = [
  {
    title: "Pick up where you left off",
    description:
      "Check off episodes one at a time or a whole season at once. Continue Watching lines up the next episode of every show you’re partway through.",
  },
  {
    title: "Find something to watch",
    description:
      "Get recommendations based on what you’ve rated highly, see what’s airing this week, and check which services are streaming a title.",
  },
  {
    title: "Take it with you",
    description: (
      <>
        The iPhone and Android apps sign in to your own server. Get them from the{" "}
        <a
          href="https://apps.apple.com/us/app/sofa-tv-movie-tracker/id6760432427"
          className="text-fd-foreground hover:text-fd-primary underline underline-offset-4"
        >
          App Store
        </a>{" "}
        or{" "}
        <a
          href="https://play.google.com/store/apps/details?id=com.jakejarvis.sofa"
          className="text-fd-foreground hover:text-fd-primary underline underline-offset-4"
        >
          Google Play
        </a>
        .
      </>
    ),
  },
];

const credits = [
  {
    role: "Logs what you finish in",
    note: "Through each server’s webhook. Plex and Emby need a premium plan; Jellyfin needs its Webhook plugin.",
    names: [
      { name: "Plex", href: "/docs/integrations/plex", logo: PlexLogo },
      { name: "Jellyfin", href: "/docs/integrations/jellyfin", logo: JellyfinLogo },
      { name: "Emby", href: "/docs/integrations/emby", logo: EmbyLogo },
    ],
  },
  {
    role: "Sends your watchlist to",
    note: "As a custom import list, so anything you add gets downloaded on the next sync.",
    names: [
      { name: "Sonarr", href: "/docs/integrations/sonarr", logo: SonarrLogo },
      { name: "Radarr", href: "/docs/integrations/radarr", logo: RadarrLogo },
    ],
  },
  {
    role: "Imports your history from",
    note: "Watches, ratings, and watchlist. Sign in to Trakt or Simkl, or upload a Letterboxd export.",
    names: [
      { name: "Trakt", href: "/docs/integrations/import", logo: TraktLogo },
      { name: "Simkl", href: "/docs/integrations/import", logo: SimklLogo },
      { name: "Letterboxd", href: "/docs/integrations/import", logo: LetterboxdLogo },
    ],
  },
];

// Mirrors docker-compose.yml at the repo root
const composeLines = [
  "services:",
  "  sofa:",
  "    image: ghcr.io/jakejarvis/sofa:edge",
  "    container_name: sofa",
  "    restart: unless-stopped",
  "    ports:",
  '      - "3000:3000"',
  "    volumes:",
  "      - sofa-data:/data",
  "    environment:",
  "      - TMDB_API_READ_ACCESS_TOKEN=${TMDB_API_READ_ACCESS_TOKEN}",
  "      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}",
  "      - BETTER_AUTH_URL=${BETTER_AUTH_URL:-http://localhost:3000}",
  "",
  "volumes:",
  "  sofa-data:",
];

// `line` is the zero-based compose line a note sits beside; `span` is how many lines it covers
const composeNotes = [
  {
    line: 2,
    span: 1,
    title: "One image, nothing else to run",
    description: "No separate database, cache, or worker. Built for amd64 and arm64.",
  },
  {
    line: 7,
    span: 2,
    title: "All your data in one volume",
    description: "The SQLite database, cached posters, and backups.",
  },
  {
    line: 10,
    span: 1,
    title: "Always up-to-date",
    description: (
      <>
        A free{" "}
        <a
          href="https://www.themoviedb.org/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-fd-foreground hover:text-fd-primary underline underline-offset-4"
        >
          TMDB read access token
        </a>{" "}
        provides the latest movie and TV show data.
      </>
    ),
  },
];

const highlightedLines = new Set(
  composeNotes.flatMap((note) => Array.from({ length: note.span }, (_, i) => note.line + i)),
);

function ComposeLine({ text }: { text: string }) {
  const match = /^(\s*)(- )?([\w-]+:(?=\s|$))?(.*)$/.exec(text);
  if (!match) return text;
  const [, indent, dash, key, rest] = match;
  return (
    <>
      {indent}
      {dash && <span className="text-fd-muted-foreground/70">{dash}</span>}
      {key && <span className="text-fd-muted-foreground">{key}</span>}
      <span className="text-fd-foreground">{rest}</span>
    </>
  );
}

const buttonBase =
  "inline-flex h-11 items-center rounded-md px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring";

export default function HomePage() {
  return (
    <div className="overflow-x-clip">
      <section className="mx-auto w-full max-w-6xl px-6 pt-14 md:pt-24">
        <h1 className="font-display text-[2.75rem] leading-[1.04] tracking-[-0.01em] text-balance md:text-7xl md:leading-[1.02]">
          Your watchlist belongs
          <br className="hidden sm:inline" /> to you.
        </h1>
        <p className="text-fd-muted-foreground mt-6 max-w-[36rem] text-lg leading-relaxed md:mt-8 md:text-xl md:leading-relaxed">
          Sofa is a movie and TV tracker you run yourself, in one Docker container. Follow shows
          episode by episode, log watches straight from your media server, and keep your history off
          someone else’s servers.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
          <Link
            href="/docs"
            className={cn(
              buttonBase,
              "bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/85",
            )}
          >
            Get started
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pt-14 md:pt-20">
        <div className="relative isolate">
          {/* The screenshot lights the page around it, like a TV in a dark room */}
          <Image
            src={screenshot}
            alt=""
            aria-hidden
            sizes="128px"
            className="screen-glow pointer-events-none absolute inset-0 -z-10 size-full select-none"
          />
          <div className="screen-image overflow-hidden rounded-lg border border-white/10 md:rounded-xl">
            <Image
              src={screenshot}
              alt="Sofa’s page for Better Call Saul: the series backdrop and poster, a Completed status, where to watch it, and the episode list for season one with every episode checked off."
              loading="eager"
              fetchPriority="high"
              placeholder="blur"
              sizes="(min-width: 1152px) 1104px, calc(100vw - 48px)"
            />
          </div>
        </div>

        <div className="mt-12 grid gap-x-10 gap-y-8 md:mt-16 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title}>
              <h2 className="text-fd-foreground text-base font-medium">{item.title}</h2>
              <p className="text-fd-muted-foreground mt-2 text-[15px] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="stack-heading"
        className="mx-auto w-full max-w-4xl px-6 py-28 md:py-40"
      >
        <h2
          id="stack-heading"
          className="font-display text-center text-4xl leading-tight text-balance md:text-5xl"
        >
          Right at home in your stack
        </h2>

        <dl className="mt-16 space-y-14 md:mt-20 md:space-y-16">
          {credits.map((credit) => (
            <div
              key={credit.role}
              className="grid grid-cols-[minmax(0,1fr)_9.25rem] items-baseline gap-x-5 md:grid-cols-2 md:gap-x-10"
            >
              <dt className="text-right">
                <span className="text-fd-foreground block text-sm md:text-base">{credit.role}</span>
                <span className="text-fd-muted-foreground mt-2 ml-auto block max-w-[17rem] text-xs leading-relaxed md:text-sm md:leading-relaxed">
                  {credit.note}
                </span>
              </dt>
              <dd>
                <ul>
                  {credit.names.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="group font-display hover:text-fd-primary focus-visible:outline-fd-ring inline-flex items-baseline gap-[0.3em] rounded-sm text-2xl leading-[1.35] focus-visible:outline-2 focus-visible:outline-offset-4 md:text-[2.5rem] md:leading-[1.25]"
                      >
                        {/* Sized to the serif's cap height so each mark sits on the baseline like a capital */}
                        <item.logo className="text-fd-muted-foreground group-hover:text-fd-primary size-[0.72em] shrink-0 transition-colors" />
                        <span className="decoration-fd-primary/60 underline-offset-[0.2em] group-hover:underline">
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="deploy-heading"
        className="mx-auto w-full max-w-6xl px-6 pb-28 md:pb-40"
      >
        <h2
          id="deploy-heading"
          className="font-display text-4xl leading-tight text-balance md:text-5xl"
        >
          Ready in minutes
        </h2>
        <p className="text-fd-muted-foreground mt-4 max-w-[36rem] text-lg leading-relaxed">
          This is the whole deployment. Sofa keeps everything in a single SQLite file, so there’s no
          database server to set up alongside it.
        </p>

        <div className="compose mt-10 grid gap-10 md:mt-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <figure className="bg-fd-card ring-fd-border min-w-0 overflow-hidden rounded-lg ring-1">
            <figcaption className="border-fd-border text-fd-muted-foreground flex h-10 items-center border-b px-4 font-mono text-xs">
              compose.yml
            </figcaption>
            <pre className="overflow-x-auto py-4 font-mono text-[13px]">
              <code className="block min-w-max">
                {composeLines.map((text, i) => (
                  <span
                    // oxlint-disable-next-line no-array-index-key -- static lines, never reordered
                    key={i}
                    className={cn(
                      "compose-line block border-l-2 border-transparent pr-6 pl-[calc(1rem-2px)]",
                      highlightedLines.has(i) && "border-fd-primary bg-fd-primary/[0.06]",
                    )}
                  >
                    <ComposeLine text={text} />
                    {text === "" && "​"}
                  </span>
                ))}
              </code>
            </pre>
          </figure>

          <ul className="relative space-y-6 lg:space-y-0">
            {composeNotes.map((note) => (
              <li
                key={note.title}
                className="compose-note lg:absolute lg:inset-x-0"
                style={{ "--line": note.line } as React.CSSProperties}
              >
                <p className="text-fd-foreground text-[15px] font-medium">{note.title}</p>
                <p className="text-fd-muted-foreground mt-1 text-sm leading-relaxed">
                  {note.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-fd-muted-foreground mt-10 max-w-[40rem] text-[15px] leading-relaxed">
          Start it with{" "}
          <code className="bg-fd-card text-fd-foreground ring-fd-border rounded px-1.5 py-0.5 font-mono text-[13px] ring-1">
            docker compose up -d
          </code>
          , open port 3000, and create your account. The first account becomes the admin.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/docs"
            className={cn(
              buttonBase,
              "bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/85",
            )}
          >
            Read the setup guide
          </Link>
          <Link
            href="/docs/configuration"
            className={cn(buttonBase, "ring-fd-border hover:bg-fd-accent ring-1 ring-inset")}
          >
            See all settings
          </Link>
        </div>
      </section>
    </div>
  );
}
