import type { NormalizedImport } from "@sofa/api/schemas";
import { IconCloudUpload, IconFileImport, IconLink } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { client, orpc } from "@/lib/orpc/client";

// ─── Source Configs ──────────────────────────────────────────

type ImportSource = "trakt" | "simkl" | "letterboxd";

interface SourceConfig {
  source: ImportSource;
  label: string;
  description: string;
  accept: string;
  icon: React.ReactNode;
  supportsOAuth: boolean;
}

// ─── Provider Logos ──────────────────────────────────────────

function TraktLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <title>Trakt</title>
      <path
        fill="currentColor"
        d="m15.082 15.107l-.73-.73l9.578-9.583a5 5 0 0 0-.115-.575L13.662 14.382l1.08 1.08l-.73.73l-1.81-1.81l11.22-11.238c-.075-.15-.155-.3-.25-.44L11.508 14.377l2.154 2.155l-.73.73l-7.193-7.199l.73-.73l4.309 4.31L22.546 1.86A5.62 5.62 0 0 0 18.362 0H5.635A5.637 5.637 0 0 0 0 5.634V18.37A5.63 5.63 0 0 0 5.635 24h12.732C21.477 24 24 21.48 24 18.37V6.19l-8.913 8.918zm-4.314-2.155L6.814 8.988l.73-.73l3.954 3.96zm1.075-1.084l-3.954-3.96l.73-.73l3.959 3.96zm9.853 5.688a4.14 4.14 0 0 1-4.14 4.14H6.438a4.144 4.144 0 0 1-4.139-4.14V6.438A4.14 4.14 0 0 1 6.44 2.3h10.387v1.04H6.438a3.1 3.1 0 0 0-3.099 3.1v11.11c0 1.71 1.39 3.105 3.1 3.105h11.117c1.71 0 3.1-1.395 3.1-3.105v-1.754h1.04v1.754z"
      />
    </svg>
  );
}

function SimklLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <title>Simkl</title>
      <path
        fill="currentColor"
        d="M3.84 0A3.83 3.83 0 0 0 0 3.84v16.32A3.83 3.83 0 0 0 3.84 24h16.32A3.83 3.83 0 0 0 24 20.16V3.84A3.83 3.83 0 0 0 20.16 0zm8.567 4.11q3.11 0 4.393.186q1.69.252 2.438.877q1.009.867 1.009 3.104q0 .241-.01.768h-4.234q-.021-.537-.074-.746q-.147-.615-.966-.692q-.725-.065-3.53-.066q-2.775 0-3.289.165q-.578.2-.578 1.024q0 .792.61.969q.514.143 4.633.275q3.73.11 4.76.275q1.04.165 1.654.495t.983.936q.556.892.557 2.873q0 2.212-.546 3.247q-.547 1.024-1.785 1.398q-1.219.374-6.71.374q-3.338 0-4.82-.187q-1.806-.22-2.593-.86q-.85-.684-1.008-1.93a10.5 10.5 0 0 1-.085-1.434v-.789H7.44q-.01 1.11.43 1.428q.232.151.525.203q.294.056 1.03.077a166 166 0 0 0 2.405.022q2.793-.01 3.234-.033q.83-.065 1.092-.23q.368-.242.368-1.077q0-.57-.231-.802q-.316-.318-1.503-.34q-.82 0-3.425-.132q-2.69-.133-3.488-.154q-2.08-.066-2.932-.505q-1.092-.56-1.429-1.91q-.189-.747-.189-1.956q0-2.547.925-3.59q.693-.79 2.102-1.044q1.271-.22 6.053-.22z"
      />
    </svg>
  );
}

function LetterboxdLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <title>Letterboxd</title>
      <path
        fill="currentColor"
        d="M8.224 14.352a4.45 4.45 0 0 1-3.775 2.092C1.992 16.444 0 14.454 0 12s1.992-4.444 4.45-4.444c1.592 0 2.988.836 3.774 2.092c-.427.682-.673 1.488-.673 2.352s.246 1.67.673 2.352M15.101 12c0-.864.247-1.67.674-2.352c-.786-1.256-2.183-2.092-3.775-2.092s-2.989.836-3.775 2.092c.427.682.674 1.488.674 2.352s-.247 1.67-.674 2.352c.786 1.256 2.183 2.092 3.775 2.092s2.989-.836 3.775-2.092A4.4 4.4 0 0 1 15.1 12zm4.45-4.444a4.45 4.45 0 0 0-3.775 2.092c.427.682.673 1.488.673 2.352s-.246 1.67-.673 2.352a4.45 4.45 0 0 0 3.775 2.092C22.008 16.444 24 14.454 24 12s-1.992-4.444-4.45-4.444z"
      />
    </svg>
  );
}

const SOURCES: SourceConfig[] = [
  {
    source: "trakt",
    label: "Trakt",
    description: "Connect your Trakt account or upload a JSON export.",
    accept: ".json",
    icon: <TraktLogo className="size-4 text-primary" />,
    supportsOAuth: true,
  },
  {
    source: "simkl",
    label: "Simkl",
    description: "Connect your Simkl account or upload a JSON export.",
    accept: ".json",
    icon: <SimklLogo className="size-4 text-primary" />,
    supportsOAuth: true,
  },
  {
    source: "letterboxd",
    label: "Letterboxd",
    description: "Upload the ZIP export from your Letterboxd account settings.",
    accept: ".zip",
    icon: <LetterboxdLogo className="size-4 text-primary" />,
    supportsOAuth: false,
  },
];

// ─── Types ──────────────────────────────────────────────────

interface ImportPreview {
  data: NormalizedImport;
  warnings: string[];
  diagnostics?: {
    unresolved: number;
    unsupported: number;
  };
  blockingErrors?: string[];
  stats: {
    movies: number;
    episodes: number;
    watchlist: number;
    ratings: number;
  };
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

interface DeviceCodeInfo {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

type DialogStep =
  | "choose" // OAuth sources: choose between Connect or Upload
  | "device-code" // displaying device code, polling
  | "fetching" // OAuth authorized, fetching data from provider
  | "preview" // showing parsed preview with options
  | "importing" // import in progress
  | "done"; // showing results

// ─── Section ────────────────────────────────────────────────

export function ImportsSection() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <IconFileImport aria-hidden className="size-4 text-muted-foreground" />
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Import
        </h2>
      </div>
      <div className="space-y-2.5">
        {SOURCES.map((config) => (
          <ImportSourceCard key={config.source} config={config} />
        ))}
      </div>
    </div>
  );
}

// ─── Source Card ─────────────────────────────────────────────

function ImportSourceCard({ config }: { config: SourceConfig }) {
  const { data: systemStatus } = useQuery(orpc.system.status.queryOptions());
  const publicApiUrl =
    systemStatus?.publicApiUrl ?? "https://public-api.sofa.watch";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>(
    config.supportsOAuth ? "choose" : "preview",
  );
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [options, setOptions] = useState({
    importWatches: true,
    importWatchlist: true,
    importRatings: true,
  });

  // OAuth state
  const [deviceCode, setDeviceCode] = useState<DeviceCodeInfo | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const importAbortRef = useRef<AbortController | null>(null);

  const parseMutation = useMutation(
    orpc.imports.parseFile.mutationOptions({
      onSuccess: (data) => {
        setPreview(data as ImportPreview);
        setStep("preview");
        setDialogOpen(true);
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to parse file",
        );
      },
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    }),
  );

  const parsePayloadMutation = useMutation(
    orpc.imports.parsePayload.mutationOptions({
      onSuccess: (data) => {
        setPreview(data as ImportPreview);
        setStep("preview");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to parse import data",
        );
        setStep("choose");
      },
    }),
  );

  // Progress state
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  function handleFileSelect(file: File) {
    parseMutation.mutate({ source: config.source, file });
  }

  async function handleImport() {
    if (!preview) return;
    setStep("importing");
    setProgress(null);

    const abort = new AbortController();
    importAbortRef.current = abort;

    try {
      const job = await client.imports.createJob({
        data: preview.data,
        options,
      });

      const eventSource = await client.imports.jobEvents(
        { id: job.id },
        { signal: abort.signal },
      );

      let receivedComplete = false;

      for await (const event of eventSource) {
        if (abort.signal.aborted) break;
        if (event.type === "complete") {
          receivedComplete = true;
          setResult({
            imported: event.job.importedCount,
            skipped: event.job.skippedCount,
            failed: event.job.failedCount,
            errors: event.job.errors,
            warnings: event.job.warnings,
          });
          setStep("done");
          if (event.job.importedCount > 0) {
            toast.success(
              `Imported ${event.job.importedCount} items from ${config.label}`,
            );
          }
        } else if (event.type === "timeout") {
          receivedComplete = true;
          toast.info(
            "Import is still running in the background. Check back later.",
          );
          setStep("preview");
        } else {
          setProgress({
            current: event.job.processedItems,
            total: event.job.totalItems,
            message: event.job.currentMessage ?? "",
          });
        }
      }

      // Stream ended without a complete/timeout event (e.g. connection dropped)
      if (!receivedComplete && !abort.signal.aborted) {
        try {
          const finalJob = await client.imports.getJob({ id: job.id });
          const isTerminal =
            finalJob.status === "success" ||
            finalJob.status === "error" ||
            finalJob.status === "cancelled";
          if (isTerminal) {
            setResult({
              imported: finalJob.importedCount,
              skipped: finalJob.skippedCount,
              failed: finalJob.failedCount,
              errors: finalJob.errors,
              warnings: finalJob.warnings,
            });
            setStep("done");
          } else {
            toast.info(
              "Import is still running in the background. Check back later.",
            );
            setStep("preview");
          }
        } catch {
          toast.error("Lost connection to import. Check status in settings.");
          setStep("preview");
        }
      }
    } catch (err) {
      if (abort.signal.aborted) return;
      toast.error(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    } finally {
      importAbortRef.current = null;
    }
  }

  // Clean up poll timer on unmount or dialog close
  const stopPollingRef = useRef(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  });
  const stopPolling = stopPollingRef.current;

  function handleClose() {
    stopPolling();
    importAbortRef.current?.abort();
    importAbortRef.current = null;
    setDialogOpen(false);
    setStep(config.supportsOAuth ? "choose" : "preview");
    setPreview(null);
    setResult(null);
    setDeviceCode(null);
    setOauthError(null);
    setOptions({
      importWatches: true,
      importWatchlist: true,
      importRatings: true,
    });
  }

  // ─── OAuth: Start device code flow ────────────────────────

  async function startDeviceCodeFlow() {
    setOauthError(null);
    setStep("device-code");

    try {
      const res = await fetch(
        `${publicApiUrl}/v1/import/${config.source}/device-code`,
        { method: "POST" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ??
            `Failed to start ${config.label} connection`,
        );
      }
      const data = (await res.json()) as DeviceCodeInfo;
      setDeviceCode(data);
      setDialogOpen(true);

      // Start polling
      startPolling(data);
    } catch (e) {
      setOauthError(e instanceof Error ? e.message : "Failed to connect");
      setStep("choose");
      setDialogOpen(true);
    }
  }

  function startPolling(code: DeviceCodeInfo) {
    stopPolling();
    const interval = (code.interval || 5) * 1000;
    const expiresAt = Date.now() + code.expires_in * 1000;

    pollTimerRef.current = setInterval(async () => {
      if (Date.now() > expiresAt) {
        stopPolling();
        setOauthError("Device code expired. Please try again.");
        setStep("choose");
        return;
      }

      try {
        const res = await fetch(
          `${publicApiUrl}/v1/import/${config.source}/poll`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device_code: code.device_code }),
          },
        );
        if (!res.ok) return;

        const data = (await res.json()) as {
          status: string;
          data?: Record<string, unknown>;
          error?: string;
        };

        if (data.status === "authorized" && data.data) {
          stopPolling();
          setStep("fetching");
          parsePayloadMutation.mutate({ data: data.data as NormalizedImport });
        } else if (data.status === "denied") {
          stopPolling();
          setOauthError("Authorization was denied. Please try again.");
          setStep("choose");
        } else if (data.status === "expired") {
          stopPolling();
          setOauthError("Device code expired. Please try again.");
          setStep("choose");
        } else if (data.status === "fetch_error") {
          stopPolling();
          setOauthError(
            data.error ||
              "Authorization succeeded but failed to fetch your library. Please try again.",
          );
          setStep("choose");
        }
        // "pending" → keep polling
      } catch {
        // Network error, keep polling
      }
    }, interval);
  }

  // Clean up on unmount
  useEffect(() => stopPolling, [stopPolling]);

  const isParsing = parseMutation.isPending;

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {config.icon}
            </div>
            <div>
              <CardTitle>{config.label}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={config.accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          <div className="flex gap-2">
            {config.supportsOAuth && (
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(true);
                  setStep("choose");
                }}
              >
                <IconLink aria-hidden />
                Connect
              </Button>
            )}
            {!config.supportsOAuth && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
              >
                {isParsing ? <Spinner /> : <IconCloudUpload aria-hidden />}
                {isParsing ? "Parsing…" : "Upload"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          {step === "choose" && (
            <ChooseStep
              config={config}
              oauthError={oauthError}
              onConnect={() => startDeviceCodeFlow()}
              onUpload={() => fileInputRef.current?.click()}
              isParsing={isParsing}
              onCancel={handleClose}
            />
          )}
          {step === "device-code" && (
            <DeviceCodeStep
              source={config.label}
              deviceCode={deviceCode}
              onCancel={handleClose}
            />
          )}
          {step === "fetching" && <FetchingStep source={config.label} />}
          {step === "preview" && preview && (
            <PreviewStep
              source={config.label}
              preview={preview}
              options={options}
              setOptions={setOptions}
              onImport={handleImport}
              onCancel={handleClose}
            />
          )}
          {step === "importing" && (
            <ImportingStep source={config.label} progress={progress} />
          )}
          {step === "done" && result && (
            <DoneStep
              source={config.label}
              result={result}
              onClose={handleClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Dialog Steps ───────────────────────────────────────────

function ChooseStep({
  config,
  oauthError,
  onConnect,
  onUpload,
  isParsing,
  onCancel,
}: {
  config: SourceConfig;
  oauthError: string | null;
  onConnect: () => void;
  onUpload: () => void;
  isParsing: boolean;
  onCancel: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Import from {config.label}</DialogTitle>
        <DialogDescription>
          Choose how to import your {config.label} data.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2">
        {oauthError && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-destructive text-sm">{oauthError}</p>
          </div>
        )}

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-border/50 p-4 text-left transition-colors hover:bg-muted/50"
          onClick={onConnect}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <IconLink aria-hidden className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Connect with {config.label}</p>
            <p className="text-muted-foreground text-xs">
              Authorize Sofa to read your {config.label} library. No password
              shared.
            </p>
          </div>
        </button>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-border/50 p-4 text-left transition-colors hover:bg-muted/50"
          onClick={() => {
            onCancel();
            // Small delay so the dialog closes before file picker opens
            setTimeout(onUpload, 150);
          }}
          disabled={isParsing}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <IconCloudUpload aria-hidden className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Upload export file</p>
            <p className="text-muted-foreground text-xs">
              Upload a {config.accept} export from your {config.label} account
              settings.
            </p>
          </div>
        </button>
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />} onClick={onCancel}>
          Cancel
        </DialogClose>
      </DialogFooter>
    </>
  );
}

function DeviceCodeStep({
  source,
  deviceCode,
  onCancel,
}: {
  source: string;
  deviceCode: DeviceCodeInfo | null;
  onCancel: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Connect to {source}</DialogTitle>
        <DialogDescription>
          Enter the code below on {source}'s website to authorize Sofa.
        </DialogDescription>
      </DialogHeader>

      {deviceCode ? (
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-sm">Your code:</p>
            <p className="rounded-lg bg-muted px-6 py-3 font-bold font-mono text-2xl tracking-widest">
              {deviceCode.user_code}
            </p>
          </div>

          <div className="flex justify-center">
            <a
              href={deviceCode.verification_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary text-sm underline-offset-4 hover:underline"
            >
              <IconLink aria-hidden className="size-4" />
              Open {source} to enter code
            </a>
          </div>

          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
            <Spinner className="size-3" />
            Waiting for authorization...
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <Spinner className="size-6" />
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}

function FetchingStep({ source }: { source: string }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Connected to {source}</DialogTitle>
        <DialogDescription>
          Fetching your library data from {source}...
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-3 py-8">
        <Spinner className="size-8" />
        <p className="text-muted-foreground text-sm">
          Retrieving your watch history, watchlist, and ratings...
        </p>
      </div>
    </>
  );
}

function PreviewStep({
  source,
  preview,
  options,
  setOptions,
  onImport,
  onCancel,
}: {
  source: string;
  preview: ImportPreview;
  options: {
    importWatches: boolean;
    importWatchlist: boolean;
    importRatings: boolean;
  };
  setOptions: (o: typeof options) => void;
  onImport: () => void;
  onCancel: () => void;
}) {
  const { stats, warnings } = preview;
  const totalItems =
    (options.importWatches ? stats.movies + stats.episodes : 0) +
    (options.importWatchlist ? stats.watchlist : 0) +
    (options.importRatings ? stats.ratings : 0);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Import from {source}</DialogTitle>
        <DialogDescription>
          Review what was found and choose what to import.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <StatBadge label="Movies" count={stats.movies} />
          <StatBadge label="Episodes" count={stats.episodes} />
          <StatBadge label="Watchlist" count={stats.watchlist} />
          <StatBadge label="Ratings" count={stats.ratings} />
        </div>

        {preview.diagnostics && preview.diagnostics.unresolved > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-muted-foreground text-xs">
              {preview.diagnostics.unresolved} items have no external IDs and
              will be resolved by title search, which may be less accurate.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="font-medium text-sm">Import options</p>
          <OptionCheckbox
            label="Watch history"
            description={`${stats.movies} movies, ${stats.episodes} episodes`}
            checked={options.importWatches}
            onChange={(v) => setOptions({ ...options, importWatches: v })}
          />
          <OptionCheckbox
            label="Watchlist"
            description={`${stats.watchlist} items`}
            checked={options.importWatchlist}
            onChange={(v) => setOptions({ ...options, importWatchlist: v })}
          />
          <OptionCheckbox
            label="Ratings"
            description={`${stats.ratings} ratings`}
            checked={options.importRatings}
            onChange={(v) => setOptions({ ...options, importRatings: v })}
          />
        </div>

        {warnings.length > 0 && (
          <div className="rounded-lg bg-yellow-500/10 p-3">
            <p className="mb-1 font-medium text-xs text-yellow-600">Warnings</p>
            <ul className="space-y-0.5 text-xs text-yellow-600/80">
              {warnings.map((w, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static display list
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />} onClick={onCancel}>
          Cancel
        </DialogClose>
        <Button onClick={onImport} disabled={totalItems === 0}>
          Import {totalItems} items
        </Button>
      </DialogFooter>
    </>
  );
}

function ImportingStep({
  source,
  progress,
}: {
  source: string;
  progress: { current: number; total: number; message: string } | null;
}) {
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Importing from {source}</DialogTitle>
        <DialogDescription>
          This may take a few minutes for large libraries. Please don't close
          this tab.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-4 py-8">
        <Progress value={pct} className="w-full" />
        <div className="flex flex-col items-center gap-1 text-center">
          {progress ? (
            <>
              <p className="font-medium text-sm">
                {progress.current} / {progress.total}
              </p>
              <p className="max-w-[300px] truncate text-muted-foreground text-xs">
                {progress.message}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Spinner className="size-3" />
              <p className="text-muted-foreground text-sm">
                Starting import...
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DoneStep({
  source,
  result,
  onClose,
}: {
  source: string;
  result: ImportResult;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Import complete</DialogTitle>
        <DialogDescription>Finished importing from {source}.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="grid grid-cols-3 gap-3">
          <StatBadge label="Imported" count={result.imported} />
          <StatBadge label="Skipped" count={result.skipped} />
          <StatBadge label="Failed" count={result.failed} />
        </div>

        {result.errors.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-lg bg-destructive/10 p-3">
            <p className="mb-1 font-medium text-destructive text-xs">
              Errors ({result.errors.length})
            </p>
            <ul className="space-y-0.5 text-destructive/80 text-xs">
              {result.errors.slice(0, 50).map((e, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static display list
                <li key={i}>{e}</li>
              ))}
              {result.errors.length > 50 && (
                <li>...and {result.errors.length - 50} more</li>
              )}
            </ul>
          </div>
        )}

        {result.warnings.length > 0 && (
          <div className="max-h-32 overflow-y-auto rounded-lg bg-yellow-500/10 p-3">
            <p className="mb-1 font-medium text-xs text-yellow-600">
              Warnings ({result.warnings.length})
            </p>
            <ul className="space-y-0.5 text-xs text-yellow-600/80">
              {result.warnings.slice(0, 20).map((w, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static display list
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function StatBadge({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2.5 text-center">
      <p className="font-semibold text-lg leading-none">{count}</p>
      <p className="mt-1 text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function OptionCheckbox({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `import-opt-${label}`;
  return (
    <div className="flex items-center gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <div>
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}
