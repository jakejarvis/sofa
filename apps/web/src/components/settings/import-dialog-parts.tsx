import { Trans, useLingui } from "@lingui/react/macro";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { ImportProgress, ImportResult } from "@/lib/import-job";

export function ImportingStep({
  source,
  progress,
}: {
  source: string;
  progress: ImportProgress | null;
}) {
  const pct =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <Trans>Importing from {source}</Trans>
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
  );
}

export function DoneStep({
  source,
  result,
  onClose,
}: {
  source: string;
  result: ImportResult;
  onClose: () => void;
}) {
  const { t } = useLingui();
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
          <Trans>Finished importing from {source}.</Trans>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="grid grid-cols-3 gap-3">
          <StatBadge label={t`Imported`} count={result.imported} />
          <StatBadge label={t`Skipped`} count={result.skipped} />
          <StatBadge label={t`Failed`} count={result.failed} />
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
        <Button onClick={onClose}>
          <Trans>Done</Trans>
        </Button>
      </DialogFooter>
    </>
  );
}

export function StatBadge({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
      <p className="text-lg leading-none font-semibold">{count}</p>
      <p className="text-muted-foreground mt-1 text-xs">{label}</p>
    </div>
  );
}

export function OptionCheckbox({
  idPrefix,
  label,
  description,
  checked,
  onChange,
}: {
  idPrefix: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `${idPrefix}-${label}`;
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
