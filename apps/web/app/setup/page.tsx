import { IconExternalLink, IconKey } from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TmdbLogo } from "@/components/tmdb-logo";
import { client } from "@/lib/orpc/client";
import { CopyButton } from "./_components/copy-button";
import { RefreshButton } from "./_components/refresh-button";

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
          className="inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
        >
          themoviedb.org
          <IconExternalLink
            aria-hidden={true}
            className="size-3.5 translate-y-[-1px] text-muted-foreground"
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
          className="inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
        >
          Settings &rarr; API
          <IconExternalLink
            aria-hidden={true}
            className="size-3.5 translate-y-[-1px] text-muted-foreground"
          />
        </a>{" "}
        and request an API key. Choose &ldquo;Developer&rdquo; when asked. You
        need the{" "}
        <span className="font-mono text-primary text-xs">
          API Read Access Token
        </span>{" "}
        (the long one).
      </>
    ),
  },
  {
    number: "3",
    title: "Add it to your environment",
    description:
      "Set the TMDB_API_READ_ACCESS_TOKEN environment variable and restart Sofa.",
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

export default function SetupPage() {
  return (
    <Suspense>
      <SetupContent />
    </Suspense>
  );
}

export async function SetupContent() {
  const info = await client.system.publicInfo({});
  if (info.tmdbConfigured) redirect("/");

  return (
    <div className="mx-auto my-10 max-w-2xl space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 font-medium text-primary text-xs">
          <IconKey aria-hidden={true} className="size-3.5" />
          Setup required
        </div>
        <h1 className="text-balance font-display text-3xl tracking-tight sm:text-4xl">
          Connect to TMDB
        </h1>
        <p className="max-w-lg text-muted-foreground leading-relaxed">
          Sofa uses{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
          >
            The Movie Database
            <IconExternalLink
              aria-hidden={true}
              className="size-3.5 translate-y-[-1px] text-muted-foreground"
            />
          </a>{" "}
          for movie & TV metadata, posters, and streaming availability.
          You&apos;ll need a free API key to get started.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {steps.map((step, i) => (
          <div key={step.number} className="flex gap-4">
            <div className="flex shrink-0 items-start pt-0.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-mono font-semibold text-primary text-sm">
                {step.number}
              </span>
            </div>
            <div className="space-y-1 overflow-x-auto">
              <h2 className="font-medium">{step.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>

              {/* Show env snippets for step 3 */}
              {i === 2 && (
                <div className="mt-4 space-y-3">
                  {envSnippets.map((snippet) => (
                    <div
                      key={snippet.label}
                      className="group relative rounded-lg border border-border/50 bg-card/60"
                    >
                      <div className="flex items-center justify-between border-border/30 border-b px-3 py-1.5">
                        <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                          {snippet.label}
                        </span>
                        <CopyButton code={snippet.code} />
                      </div>
                      <pre className="overflow-x-auto p-3 font-mono text-foreground/80 text-sm">
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
      <div className="rounded-xl border border-border/50 bg-card/40 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="font-medium text-sm">
              After setting the key and restarting:
            </p>
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
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </div>
    </div>
  );
}
