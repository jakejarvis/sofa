import { useLingui } from "@lingui/react/macro";
import { IconHistory } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { getErrorMessage } from "@/lib/error-messages";
import { orpc } from "@/lib/orpc/client";
import { invalidateTrackingQueries } from "@/lib/orpc/invalidate";

function todayLocal() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Log a watch of a movie on a chosen date (and optional time). */
export function LogWatchDialog({ titleId }: { titleId: string }) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
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
    // Date-only watches land at local noon, matching imported date-only watches.
    const watchedAt = new Date(`${date}T${time || "12:00"}:00`);
    if (Number.isNaN(watchedAt.getTime())) return;
    mutate({ kind: "movie", id: titleId, watchedAt: watchedAt.toISOString() });
  }

  return (
    <>
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{t`Log a watch`}</DialogTitle>
              <DialogDescription>{t`Record when you watched this.`}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="log-watch-date">{t`Date`}</Label>
                <Input
                  id="log-watch-date"
                  type="date"
                  required
                  value={date}
                  max={todayLocal()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="log-watch-time">{t`Time (optional)`}</Label>
                <Input
                  id="log-watch-time"
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
