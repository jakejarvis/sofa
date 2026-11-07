import { useLingui } from "@lingui/react/macro";
import { IconCalendarPlus, IconHistory } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/error-messages";
import { orpc } from "@/lib/orpc/client";
import { invalidateTrackingQueries } from "@/lib/orpc/invalidate";

function todayLocal() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Resolve the picked date/time to a timestamp. Date-only watches land at local noon (matching
 * imported date-only watches), clamped to `now` when noon hasn't happened yet today. Returns
 * null for an invalid or future result.
 */
export function resolveWatchedAt(date: string, time: string, now: Date): Date | null {
  if (time) {
    const picked = new Date(`${date}T${time}:00`);
    if (Number.isNaN(picked.getTime()) || picked > now) return null;
    return picked;
  }
  const noon = new Date(`${date}T12:00:00`);
  if (Number.isNaN(noon.getTime())) return null;
  return noon > now ? now : noon;
}

/**
 * Log a watch of a movie or an episode on a chosen date (and optional time). Movies get a
 * labeled button; episodes get a compact icon button that fits in an episode row.
 */
export function LogWatchDialog({
  kind,
  id,
  episodeLabel,
}: {
  kind: "movie" | "episode";
  /** Movie title ID or episode ID. */
  id: string;
  /** Short episode name for the dialog and button label (e.g. "S01E03 · Pilot"). */
  episodeLabel?: string;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayLocal);
  const [time, setTime] = useState("");

  const { mutate, isPending } = useMutation(
    orpc.tracking.logWatch.mutationOptions({
      onSuccess: async () => {
        toast.success(t`Watch logged`);
        setOpen(false);
        await invalidateTrackingQueries(queryClient);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, t`Failed to log watch`));
      },
    }),
  );

  function handleOpenChange(next: boolean) {
    if (next) {
      setDate(todayLocal());
      setTime("");
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || isPending) return;
    const watchedAt = resolveWatchedAt(date, time, new Date());
    if (!watchedAt) {
      toast.error(t`That time is in the future`);
      return;
    }
    mutate({ kind, id, watchedAt: watchedAt.toISOString() });
  }

  const episodeButtonLabel = episodeLabel
    ? t`Log a watch of ${episodeLabel} on a date…`
    : t`Log a watch on a date…`;

  return (
    <>
      {kind === "movie" ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-9 rounded-lg px-4 text-sm active:scale-[0.97]"
          onClick={() => handleOpenChange(true)}
        >
          <IconHistory aria-hidden={true} className="size-3.5" />
          {t`Log a watch…`}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={episodeButtonLabel}
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => handleOpenChange(true)}
              />
            }
          >
            <IconCalendarPlus aria-hidden={true} className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{t`Log a watch on a date…`}</TooltipContent>
        </Tooltip>
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{t`Log a watch`}</DialogTitle>
              <DialogDescription>
                {kind === "episode" && episodeLabel
                  ? t`Record when you watched ${episodeLabel}.`
                  : t`Record when you watched this.`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`${fieldId}-date`}>{t`Date`}</Label>
                <Input
                  id={`${fieldId}-date`}
                  type="date"
                  required
                  value={date}
                  max={todayLocal()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${fieldId}-time`}>{t`Time (optional)`}</Label>
                <Input
                  id={`${fieldId}-time`}
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || !date}>
                {t`Log watch`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
