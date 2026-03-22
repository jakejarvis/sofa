import { Trans, useLingui } from "@lingui/react/macro";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconCloudDownload,
  IconCloudUpload,
  IconLockPassword,
  IconLogout,
  IconPencil,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { authClient, signOut } from "@/lib/auth/client";
import { getErrorMessage } from "@/lib/error-messages";
import { client, orpc } from "@/lib/orpc/client";
import type { NormalizedImport } from "@sofa/api/schemas";
import { formatDate } from "@sofa/i18n/format";

export function AccountSection({
  user,
}: {
  user: {
    name: string;
    email: string;
    image?: string;
    createdAt: string;
    role?: string;
  };
}) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(user.image);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user.name);
  const [editValue, setEditValue] = useState(user.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const updateNameMutation = useMutation(
    orpc.account.updateName.mutationOptions({
      onSuccess: () => {
        const trimmed = editValue.trim();
        setDisplayName(trimmed);
        setIsEditingName(false);
        toast.success(t`Name updated`);
        router.invalidate();
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, t, t`Update failed`));
      },
    }),
  );
  const isNamePending = updateNameMutation.isPending;

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const memberSince = formatDate(user.createdAt, {
    year: "numeric",
    month: "long",
    day: undefined,
  });
  const initial = displayName?.charAt(0).toUpperCase() ?? "?";

  const uploadAvatarMutation = useMutation(orpc.account.uploadAvatar.mutationOptions());

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatarMutation.mutate(file, {
      onSuccess: (data) => {
        setAvatarUrl(data.imageUrl);
        toast.success(t`Profile picture updated`);
        router.invalidate();
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, t, t`Upload failed`));
      },
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  }

  const removeAvatarMutation = useMutation(
    orpc.account.removeAvatar.mutationOptions({
      onSuccess: () => {
        setAvatarUrl(undefined);
        toast.success(t`Profile picture removed`);
        router.invalidate();
      },
      onError: () => {
        toast.error(t`Failed to remove profile picture`);
      },
    }),
  );
  const isAvatarPending = uploadAvatarMutation.isPending || removeAvatarMutation.isPending;

  function handleRemoveAvatar() {
    removeAvatarMutation.mutate();
  }

  function handleNameSave() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === displayName) {
      setEditValue(displayName);
      setIsEditingName(false);
      return;
    }

    updateNameMutation.mutate({ name: trimmed });
  }

  function handleNameCancel() {
    setEditValue(displayName);
    setIsEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === "Escape") {
      handleNameCancel();
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <IconUser aria-hidden={true} className="text-muted-foreground size-4" />
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          <Trans>Account</Trans>
        </h2>
      </div>
      <Card className="pb-0">
        <CardContent className="flex items-center gap-4">
          {/* Avatar: click to upload (no avatar) or remove (has avatar) */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={avatarUrl ? handleRemoveAvatar : () => fileInputRef.current?.click()}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  disabled={isAvatarPending}
                />
              }
              className="focus-visible:ring-ring focus-visible:ring-offset-background relative shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label={avatarUrl ? t`Remove profile picture` : t`Upload profile picture`}
            >
              <Avatar className="size-12 overflow-hidden">
                <AvatarImage src={isAvatarPending ? undefined : avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-primary/10 font-display text-primary text-lg">
                  {initial}
                </AvatarFallback>
              </Avatar>

              <AnimatePresence>
                {(isHovered || isAvatarPending) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`text-foreground/70 absolute inset-0 flex items-center justify-center rounded-full backdrop-blur-sm ${
                      avatarUrl && !isAvatarPending ? "bg-destructive/40" : "bg-black/50"
                    }`}
                  >
                    {isAvatarPending ? (
                      <Spinner className="size-4.5" />
                    ) : avatarUrl ? (
                      <IconTrash className="size-4.5" />
                    ) : (
                      <IconCamera className="size-4.5" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </TooltipTrigger>
            <TooltipContent>
              {avatarUrl ? <Trans>Remove picture</Trans> : <Trans>Upload picture</Trans>}
            </TooltipContent>
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="min-w-0 flex-1">
            <CardTitle className="mb-0.5">
              <AnimatePresence mode="wait" initial={false}>
                {isEditingName ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="flex items-center gap-1.5"
                  >
                    <div className="relative inline-grid items-center">
                      <span
                        className="invisible col-start-1 row-start-1 text-sm font-medium whitespace-pre"
                        aria-hidden="true"
                      >
                        {editValue || " "}
                      </span>
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        onBlur={handleNameSave}
                        disabled={isNamePending}
                        maxLength={100}
                        className="border-primary/40 focus:border-primary col-start-1 row-start-1 min-w-4 border-0 border-b border-dashed bg-transparent text-sm font-medium transition-colors outline-none"
                      />
                    </div>
                    {isNamePending ? (
                      <Spinner className="text-muted-foreground size-3.5 shrink-0" />
                    ) : (
                      <>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNameSave();
                          }}
                          className="text-muted-foreground hover:text-primary shrink-0 rounded-md p-0.5 transition-colors"
                          aria-label={t`Save name`}
                        >
                          <IconCheck className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNameCancel();
                          }}
                          className="text-muted-foreground hover:text-destructive shrink-0 rounded-md p-0.5 transition-colors"
                          aria-label={t`Cancel editing`}
                        >
                          <IconX className="size-3.5" />
                        </button>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="display"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="group/name hover:text-primary inline-flex items-center gap-1.5 rounded-md px-0 text-start transition-colors"
                  >
                    {displayName}
                    <IconPencil className="group-hover/name:text-muted-foreground size-3 text-transparent transition-colors" />
                  </motion.button>
                )}
              </AnimatePresence>
            </CardTitle>
            <CardDescription>
              {user.email}
              {user.role === "admin" && (
                <Badge className="bg-primary/10 text-primary ms-1.5 rounded-md border-0 align-middle">
                  <Trans>Admin</Trans>
                </Badge>
              )}
            </CardDescription>
            <p className="text-muted-foreground/60 mt-0.5 text-xs">
              <Trans>Member since {memberSince}</Trans>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <ChangePasswordDialog />
            <Button
              variant="destructive"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/" });
              }}
            >
              <IconLogout aria-hidden={true} />
              <Trans>Sign out</Trans>
            </Button>
          </div>
        </CardContent>

        <div className="border-border/30 space-y-px border-t">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/export/user-data";
            }}
            className="group hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-start transition-colors"
          >
            <div className="bg-muted group-hover:bg-primary/10 flex size-7.5 shrink-0 items-center justify-center rounded-lg">
              <IconCloudDownload
                aria-hidden={true}
                className="text-muted-foreground group-hover:text-primary size-3.5"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[13px] leading-none font-medium">
                <Trans>Export</Trans>
              </p>
              <p className="text-muted-foreground text-[11px]">
                <Trans>Download your library, watch history, and ratings as JSON</Trans>
              </p>
            </div>
            <IconArrowRight
              aria-hidden={true}
              className="text-muted-foreground size-3.5 shrink-0"
            />
          </button>
          <SofaImportDialog />
        </div>
      </Card>
    </div>
  );
}

// ─── Sofa Import Dialog ─────────────────────────────────────

interface ImportPreview {
  data: NormalizedImport;
  warnings: string[];
  diagnostics?: { unresolved: number; unsupported: number };
  stats: { movies: number; episodes: number; watchlist: number; ratings: number };
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

function SofaImportDialog() {
  const { t } = useLingui();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importAbortRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"preview" | "importing" | "done">("preview");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const [options, setOptions] = useState({
    importWatches: true,
    importWatchlist: true,
    importRatings: true,
  });

  const parseMutation = useMutation(
    orpc.imports.parseFile.mutationOptions({
      onSuccess: (data) => {
        setPreview(data as ImportPreview);
        setStep("preview");
        setOpen(true);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, t, t`Failed to parse file`));
      },
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    }),
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    parseMutation.mutate({ source: "sofa", file });
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

      const eventSource = await client.imports.jobEvents({ id: job.id }, { signal: abort.signal });

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
          const importedCount = event.job.importedCount;
          if (importedCount > 0) {
            toast.success(t`Imported ${importedCount} items from Sofa export`);
          }
        } else if (event.type === "timeout") {
          receivedComplete = true;
          toast.info(t`Import is still running in the background. Check back later.`);
          handleClose();
        } else {
          setProgress({
            current: event.job.processedItems,
            total: event.job.totalItems,
            message: event.job.currentMessage ?? "",
          });
        }
      }

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
            toast.info(t`Import is still running in the background. Check back later.`);
            handleClose();
          }
        } catch {
          toast.error(t`Lost connection to import. Check status in settings.`);
          handleClose();
        }
      }
    } catch (err) {
      if (abort.signal.aborted) return;
      toast.error(getErrorMessage(err, t, t`Import failed`));
      setStep("preview");
    } finally {
      importAbortRef.current = null;
    }
  }

  function handleClose() {
    importAbortRef.current?.abort();
    importAbortRef.current = null;
    setOpen(false);
    setStep("preview");
    setPreview(null);
    setResult(null);
    setProgress(null);
    setOptions({ importWatches: true, importWatchlist: true, importRatings: true });
  }

  const isParsing = parseMutation.isPending;

  const totalItems = preview
    ? (options.importWatches ? preview.stats.movies + preview.stats.episodes : 0) +
      (options.importWatchlist ? preview.stats.watchlist : 0) +
      (options.importRatings ? preview.stats.ratings : 0)
    : 0;

  const pct =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isParsing}
        className="group hover:bg-muted/40 flex w-full items-center gap-3 rounded-b-lg px-4 py-3 text-start transition-colors disabled:opacity-50"
      >
        <div className="bg-muted group-hover:bg-primary/10 flex size-7.5 shrink-0 items-center justify-center rounded-lg">
          {isParsing ? (
            <Spinner className="text-primary size-3.5" />
          ) : (
            <IconCloudUpload
              aria-hidden={true}
              className="text-muted-foreground group-hover:text-primary size-3.5"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[13px] leading-none font-medium">
            {isParsing ? <Trans>Parsing file...</Trans> : <Trans>Import</Trans>}
          </p>
          <p className="text-muted-foreground text-[11px]">
            <Trans>Restore from a Sofa export file</Trans>
          </p>
        </div>
        <IconArrowRight aria-hidden={true} className="text-muted-foreground size-3.5 shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-md">
          {step === "preview" &&
            preview &&
            (() => {
              const movieCount = preview.stats.movies;
              const episodeCount = preview.stats.episodes;
              const watchlistCount = preview.stats.watchlist;
              const ratingCount = preview.stats.ratings;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      <Trans>Import Sofa data</Trans>
                    </DialogTitle>
                    <DialogDescription>
                      <Trans>Review what was found and choose what to import.</Trans>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <ImportStatBadge label={t`Movies`} count={movieCount} />
                      <ImportStatBadge label={t`Episodes`} count={episodeCount} />
                      <ImportStatBadge label={t`Library`} count={watchlistCount} />
                      <ImportStatBadge label={t`Ratings`} count={ratingCount} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        <Trans>Import options</Trans>
                      </p>
                      <ImportOptionCheckbox
                        label={t`Watch history`}
                        description={t`${movieCount} movies, ${episodeCount} episodes`}
                        checked={options.importWatches}
                        onChange={(v) => setOptions({ ...options, importWatches: v })}
                      />
                      <ImportOptionCheckbox
                        label={t`Library statuses`}
                        description={t`${watchlistCount} items`}
                        checked={options.importWatchlist}
                        onChange={(v) => setOptions({ ...options, importWatchlist: v })}
                      />
                      <ImportOptionCheckbox
                        label={t`Ratings`}
                        description={t`${ratingCount} ratings`}
                        checked={options.importRatings}
                        onChange={(v) => setOptions({ ...options, importRatings: v })}
                      />
                    </div>

                    {preview.warnings.length > 0 && (
                      <div className="rounded-lg bg-yellow-500/10 p-3">
                        <p className="mb-1 text-xs font-medium text-yellow-600">
                          <Trans>Warnings</Trans>
                        </p>
                        <ul className="space-y-0.5 text-xs text-yellow-600/80">
                          {preview.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />} onClick={handleClose}>
                      <Trans>Cancel</Trans>
                    </DialogClose>
                    <Button onClick={handleImport} disabled={totalItems === 0}>
                      <Trans>Import {totalItems} items</Trans>
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}

          {step === "importing" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  <Trans>Importing data</Trans>
                </DialogTitle>
                <DialogDescription>
                  <Trans>
                    This may take a few minutes for large libraries. Please don't close this tab.
                  </Trans>
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-8">
                <Progress value={pct} className="w-full" />
                <div className="flex flex-col items-center gap-1 text-center">
                  {progress ? (
                    <>
                      <p className="text-sm font-medium">
                        {progress.current} / {progress.total}
                      </p>
                      <p className="text-muted-foreground max-w-[300px] truncate text-xs">
                        {progress.message}
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Spinner className="size-3" />
                      <p className="text-muted-foreground text-sm">
                        <Trans>Starting import...</Trans>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {step === "done" &&
            result &&
            (() => {
              const errorCount = result.errors.length;
              const warningCount = result.warnings.length;
              const remainingErrors = errorCount - 50;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      <Trans>Import complete</Trans>
                    </DialogTitle>
                    <DialogDescription>
                      <Trans>Finished importing your Sofa export.</Trans>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-3 gap-3">
                      <ImportStatBadge label={t`Imported`} count={result.imported} />
                      <ImportStatBadge label={t`Skipped`} count={result.skipped} />
                      <ImportStatBadge label={t`Failed`} count={result.failed} />
                    </div>

                    {errorCount > 0 && (
                      <div className="bg-destructive/10 max-h-40 overflow-y-auto rounded-lg p-3">
                        <p className="text-destructive mb-1 text-xs font-medium">
                          <Trans>Errors ({errorCount})</Trans>
                        </p>
                        <ul className="text-destructive/80 space-y-0.5 text-xs">
                          {result.errors.slice(0, 50).map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                          {errorCount > 50 && (
                            <li>
                              <Trans>...and {remainingErrors} more</Trans>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {warningCount > 0 && (
                      <div className="max-h-32 overflow-y-auto rounded-lg bg-yellow-500/10 p-3">
                        <p className="mb-1 text-xs font-medium text-yellow-600">
                          <Trans>Warnings ({warningCount})</Trans>
                        </p>
                        <ul className="space-y-0.5 text-xs text-yellow-600/80">
                          {result.warnings.slice(0, 20).map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button onClick={handleClose}>
                      <Trans>Done</Trans>
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImportStatBadge({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
      <p className="text-lg leading-none font-semibold">{count}</p>
      <p className="text-muted-foreground mt-1 text-xs">{label}</p>
    </div>
  );
}

function ImportOptionCheckbox({
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
  const id = `sofa-import-${label}`;
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

// ─── Change Password Dialog ─────────────────────────────────

function ChangePasswordDialog() {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setRevokeOtherSessions(false);
    setError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError(t`Current password is required`);
      return;
    }
    if (newPassword.length < 8) {
      setError(t`New password must be at least 8 characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t`Passwords do not match`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });
      if (result.error) {
        setError(t`Failed to change password`);
        return;
      }
      toast.success(t`Password updated`);
      handleOpenChange(false);
    } catch {
      setError(t`Something went wrong`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <IconLockPassword aria-hidden={true} />
        <Trans>Change password</Trans>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Change password</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Enter your current password and choose a new one.</Trans>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          {error && (
            <Alert variant="destructive">
              <IconAlertTriangle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="current-password">
              <Trans>Current password</Trans>
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="new-password">
              <Trans>New password</Trans>
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password">
              <Trans>Confirm new password</Trans>
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="revoke-sessions"
              checked={revokeOtherSessions}
              onCheckedChange={(checked) => setRevokeOtherSessions(checked === true)}
              disabled={isSubmitting}
            />
            <Label htmlFor="revoke-sessions" className="cursor-pointer">
              <Trans>Sign out of other sessions</Trans>
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button variant="outline" />}>
              <Trans>Cancel</Trans>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="size-3.5" />}
              <Trans>Update password</Trans>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
