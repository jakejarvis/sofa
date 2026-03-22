import { Trans } from "@lingui/react/macro";
import { IconExternalLink, IconKey } from "@tabler/icons-react";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { CopyButton } from "@/components/setup/copy-button";
import { RefreshButton } from "@/components/setup/refresh-button";
import { TmdbLogo } from "@/components/tmdb-logo";
import { client } from "@/lib/orpc/client";

const steps = [
  {
    number: "1",
    title: "Create a TMDB account",
    description: (
      <>
        Head to{" "}
        <a
          href="https://www.themoviedb.org/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary decoration-primary/30 hover:decoration-primary inline-flex items-center gap-1 font-medium underline underline-offset-2 transition-colors"
        >
          themoviedb.org
          <IconExternalLink
            aria-hidden={true}
            className="text-muted-foreground size-3.5 translate-y-[-1px]"
          />
        </a>{" "}
        and sign up for a free account.
      </>
    ),
  },
  {
    number: "2",
    title: "Request an API key",
    description: (
      <>
        Go to{" "}
        <a
          href="https://www.themoviedb.org/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary decoration-primary/30 hover:decoration-primary inline-flex items-center gap-1 font-medium underline underline-offset-2 transition-colors"
        >
          Settings &rarr; API
          <IconExternalLink
            aria-hidden={true}
            className="text-muted-foreground size-3.5 translate-y-[-1px]"
          />
        </a>{" "}
        and request an API key. Choose &ldquo;Developer&rdquo; when asked. You need the{" "}
        <span className="text-primary font-mono text-xs">API Read Access Token</span> (the long
        one).
      </>
    ),
  },
  {
    number: "3",
    title: "Add it to your environment",
    description: "Set the TMDB_API_READ_ACCESS_TOKEN environment variable and restart Sofa.",
  },
];

const envSnippets = [
  {
    label: ".env file",
    code: "TMDB_API_READ_ACCESS_TOKEN=your_api_read_access_token_here",
  },
  {
    label: "Docker Compose",
    code: `environment:
  - TMDB_API_READ_ACCESS_TOKEN=your_api_read_access_token_here`,
  },
  {
    label: "Docker run",
    code: "docker run -e TMDB_API_READ_ACCESS_TOKEN=your_api_read_access_token_here ...",
  },
];

export const Route = createFileRoute("/setup")({
  beforeLoad: async () => {
    const info = await client.system.publicInfo({});
    if (info.tmdbConfigured) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Setup — Sofa" }] }),
  component: SetupPage,
});

function SetupPage() {
  return (
    <div className="mx-auto my-10 max-w-2xl space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="border-primary/20 bg-primary/5 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
          <IconKey aria-hidden={true} className="size-3.5" />
          <Trans>Setup required</Trans>
        </div>
        <h1 className="font-display text-3xl tracking-tight text-balance sm:text-4xl">
          <Trans>Connect to TMDB</Trans>
        </h1>
        <p className="text-muted-foreground max-w-lg leading-relaxed">
          Sofa uses{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary decoration-primary/30 hover:decoration-primary inline-flex items-center gap-1 font-medium underline underline-offset-2 transition-colors"
          >
            The Movie Database
            <IconExternalLink
              aria-hidden={true}
              className="text-muted-foreground size-3.5 translate-y-[-1px]"
            />
          </a>{" "}
          for movie & TV metadata, posters, and streaming availability. You&apos;ll need a free API
          key to get started.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {steps.map((step, i) => (
          <div key={step.number} className="flex gap-4">
            <div className="flex shrink-0 items-start pt-0.5">
              <span className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full font-mono text-sm font-semibold">
                {step.number}
              </span>
            </div>
            <div className="space-y-1 overflow-x-auto">
              <h2 className="font-medium">{step.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>

              {/* Show env snippets for step 3 */}
              {i === 2 && (
                <div className="mt-4 space-y-3">
                  {envSnippets.map((snippet) => (
                    <div
                      key={snippet.label}
                      className="group border-border/50 bg-card/60 relative rounded-lg border"
                    >
                      <div className="border-border/30 flex items-center justify-between border-b px-3 py-1.5">
                        <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                          {snippet.label}
                        </span>
                        <CopyButton code={snippet.code} />
                      </div>
                      <pre className="text-foreground/80 overflow-x-auto p-3 font-mono text-sm">
                        {snippet.code}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Status check */}
      <div className="border-border/50 bg-card/40 rounded-xl border p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">After setting the key and restarting:</p>
            <p className="text-muted-foreground text-xs">
              Click the button to verify your configuration
            </p>
          </div>
          <RefreshButton />
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center gap-2">
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-70"
        >
          <TmdbLogo className="h-3" />
        </a>
        <p className="text-muted-foreground text-[10px] leading-relaxed">
          <Trans>This product uses the TMDB API but is not endorsed or certified by TMDB.</Trans>
        </p>
      </div>
    </div>
  );
}
