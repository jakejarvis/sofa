"use client";

import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconKey,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { checkTmdbConfigured } from "@/lib/actions/setup";

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
          <IconExternalLink aria-hidden={true} className="size-3.5" />
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
          <IconExternalLink aria-hidden={true} className="size-3.5" />
        </a>{" "}
        and request an API key. Choose &ldquo;Developer&rdquo; when asked. You
        need the{" "}
        <span className="font-mono text-xs text-primary">
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
    code: "docker run -e TMDB_API_READ_ACCESS_TOKEN=your_token ...",
  },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 24 },
  },
};

export function SetupForm() {
  const router = useRouter();
  const [configured, checkAction, isPending] = useActionState(
    () => checkTmdbConfigured(),
    false,
  );
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (configured) {
      const t = setTimeout(() => router.push("/"), 1500);
      return () => clearTimeout(t);
    }
  }, [configured, router]);

  function copySnippet(idx: number, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <motion.div
      className="mx-auto max-w-2xl space-y-10"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
    >
      {/* Header */}
      <motion.div variants={sectionVariants} className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <IconKey aria-hidden={true} className="size-3.5" />
          Setup required
        </div>
        <h1 className="font-display text-3xl tracking-tight text-balance sm:text-4xl">
          Connect to TMDB
        </h1>
        <p className="max-w-lg text-muted-foreground leading-relaxed">
          Sofa uses{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-primary"
          >
            The Movie Database
          </a>{" "}
          for movie & TV metadata, posters, and streaming availability.
          You&apos;ll need a free API key to get started.
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div variants={sectionVariants} className="space-y-6">
        {steps.map((step, i) => (
          <div key={step.number} className="flex gap-4">
            <div className="flex shrink-0 items-start pt-0.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                {step.number}
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="font-medium">{step.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>

              {/* Show env snippets for step 3 */}
              {i === 2 && (
                <div className="mt-4 space-y-3">
                  {envSnippets.map((snippet, idx) => (
                    <div
                      key={snippet.label}
                      className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/60"
                    >
                      <div className="flex items-center justify-between border-b border-border/30 px-3 py-1.5">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {snippet.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => copySnippet(idx, snippet.code)}
                          className="text-[11px] text-muted-foreground"
                        >
                          {copiedIdx === idx ? (
                            <>
                              <IconCheck
                                aria-hidden={true}
                                className="size-3 text-green-400"
                              />
                              Copied
                            </>
                          ) : (
                            <>
                              <IconCopy aria-hidden={true} className="size-3" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <pre className="overflow-x-auto p-3 font-mono text-sm text-foreground/80">
                        {snippet.code}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Status check */}
      <motion.div variants={sectionVariants}>
        <div className="rounded-xl border border-border/50 bg-card/40 p-5">
          {configured ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <IconCheck
                  aria-hidden={true}
                  className="size-5 text-green-400"
                />
              </div>
              <div>
                <p className="font-medium text-green-400">
                  TMDB API key detected
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to Sofa…
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  After setting the key and restarting:
                </p>
                <p className="text-xs text-muted-foreground">
                  Click the button to verify your configuration
                </p>
              </div>
              <form action={checkAction}>
                <Button
                  type="submit"
                  disabled={isPending}
                  size="lg"
                  className="h-9 rounded-lg px-4 text-sm hover:shadow-md hover:shadow-primary/20"
                >
                  {isPending ? (
                    <>
                      <Spinner className="size-3" />
                      Checking…
                    </>
                  ) : (
                    "Check configuration"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
