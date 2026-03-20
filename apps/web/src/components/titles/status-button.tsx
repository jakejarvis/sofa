import { Trans, useLingui } from "@lingui/react/macro";
import {
  IconBookmarkFilled,
  IconCheck,
  IconPlayerPlayFilled,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StatusButtonProps {
  currentStatus: string | null;
  onChange: (status: string | null) => void;
}

export function StatusButton({ currentStatus, onChange }: StatusButtonProps) {
  const { t } = useLingui();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const completedStyle = {
    class: "text-status-completed",
    bgClass: "bg-status-completed/10 hover:bg-status-completed/15",
    borderClass: "ring-status-completed/20",
  };

  const statusConfig = {
    in_watchlist: {
      label: t`In Watchlist`,
      icon: IconBookmarkFilled,
      class: "text-primary",
      bgClass: "bg-primary/10 hover:bg-primary/15",
      borderClass: "ring-primary/20",
    },
    watching: {
      label: t`Watching`,
      icon: IconPlayerPlayFilled,
      class: "text-status-watching",
      bgClass: "bg-status-watching/10 hover:bg-status-watching/15",
      borderClass: "ring-status-watching/20",
    },
    caught_up: {
      label: t`Caught Up`,
      icon: IconCheck,
      ...completedStyle,
    },
    completed: {
      label: t`Completed`,
      icon: IconCheck,
      ...completedStyle,
    },
  } as const;

  const config = statusConfig[currentStatus as keyof typeof statusConfig] ?? null;

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {!config ? (
          <motion.button
            key="add"
            type="button"
            onClick={() => onChange("watchlist")}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="bg-primary/10 text-primary ring-primary/20 hover:bg-primary/15 hover:ring-primary/30 inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium ring-1 transition-all active:scale-[0.97]"
          >
            <IconPlus aria-hidden={true} className="size-3.5" strokeWidth={2.5} />
            {t`Watchlist`}
          </motion.button>
        ) : (
          <motion.button
            key="status"
            type="button"
            onClick={() => setConfirmOpen(true)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            title={t`Remove from library`}
            className={`group inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium ring-1 transition-all active:scale-[0.97] ${config.class} ${config.bgClass} ${config.borderClass} hover:!bg-destructive/10 hover:!text-destructive hover:!ring-destructive/30`}
          >
            <span className="grid [&>svg]:col-start-1 [&>svg]:row-start-1">
              <config.icon
                aria-hidden={true}
                className="size-3.5 transition-opacity group-hover:opacity-0"
              />
              <IconX
                aria-hidden={true}
                className="text-destructive size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </span>
            <span className="grid [&>span]:col-start-1 [&>span]:row-start-1">
              <span className="transition-opacity group-hover:opacity-0">{config.label}</span>
              <span className="opacity-0 transition-opacity group-hover:opacity-100">
                {t`Remove`}
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Remove from library?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                This title will be removed from your library. Your watch history and ratings will be
                kept.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onChange(null);
                setConfirmOpen(false);
              }}
            >
              <Trans>Remove</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
