"use client";

import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconKey,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
          <IconExternalLink size={14} />
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
          <IconExternalLink size={14} />
        </a>{" "}
        and request an API key. Choose &ldquo;Developer&rdquo; when asked. You
        need the{" "}
        <span className="font-mono text-xs text-primary">
          API Read Access Token
        </span>{" "}
        (the long one starting with{" "}
        <span className="font-mono text-xs text-muted-foreground">eyJ...</span>
        ).
      </>
    ),
  },
  {
    number: "3",
    title: "Add it to your environment",
    description: "Set the TMDB_API_KEY environment variable and restart Sofa.",
  },
];

const envSnippets = [
  {
    label: ".env file",
    code: "TMDB_API_KEY=your_api_read_access_token_here",
  },
  {
    label: "Docker Compose",
    code: `environment:
  - TMDB_API_KEY=your_api_read_access_token_here`,
  },
  {
    label: "Docker run",
    code: "docker run -e TMDB_API_KEY=your_token ...",
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

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/setup/status");
      if (res.ok) {
        const data = await res.json();
        setConfigured(data.tmdbConfigured);
        if (data.tmdbConfigured) {
          // Key is now set — redirect to landing after a beat
          setTimeout(() => router.push("/"), 1500);
        }
      }
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

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
          <IconKey size={14} />
          Setup required
        </div>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
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
              <h3 className="font-medium">{step.title}</h3>
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
                        <button
                          type="button"
                          onClick={() => copySnippet(idx, snippet.code)}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          {copiedIdx === idx ? (
                            <>
                              <IconCheck size={12} className="text-green-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <IconCopy size={12} />
                              Copy
                            </>
                          )}
                        </button>
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
          {configured === true ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <IconCheck size={20} className="text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-400">
                  TMDB API key detected
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to Sofa...
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
              <button
                type="button"
                onClick={checkStatus}
                disabled={checking}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:shadow-md hover:shadow-primary/20 disabled:opacity-50"
              >
                {checking ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Checking...
                  </>
                ) : (
                  "Check configuration"
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
