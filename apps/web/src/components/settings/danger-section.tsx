import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { IconDatabase, IconPhoto, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { client, orpc } from "@/lib/orpc/client";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function CacheSection() {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const invalidateHealth = () =>
    queryClient.invalidateQueries({ queryKey: orpc.admin.systemHealth.key() });

  const purgeMetadata = useMutation(
    orpc.admin.purgeMetadataCache.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          t`Purged ${plural(data.deletedTitles, { one: "# stale title", other: "# stale titles" })} and ${plural(data.deletedPersons, { one: "# orphaned person", other: "# orphaned persons" })}`,
        );
        invalidateHealth();
      },
      onError: () => toast.error(t`Failed to purge metadata cache`),
    }),
  );

  const purgeImages = useMutation(
    orpc.admin.purgeImageCache.mutationOptions({
      onSuccess: (data) => {
        const freed = formatBytes(data.freedBytes);
        toast.success(
          t`Deleted ${plural(data.deletedFiles, { one: "# file", other: "# files" })}, freed ${freed}`,
        );
        invalidateHealth();
      },
      onError: () => toast.error(t`Failed to purge image cache`),
    }),
  );

  const purgeAll = useMutation({
    mutationFn: () =>
      Promise.all([client.admin.purgeMetadataCache(), client.admin.purgeImageCache()]),
    onSuccess: ([metaResult, imageResult]) => {
      const freed = formatBytes(imageResult.freedBytes);
      toast.success(
        t`Purged ${plural(metaResult.deletedTitles, { one: "# title", other: "# titles" })}, ${plural(metaResult.deletedPersons, { one: "# person", other: "# persons" })}, ${plural(imageResult.deletedFiles, { one: "# file", other: "# files" })} (${freed} freed)`,
      );
      invalidateHealth();
    },
    onError: () => toast.error(t`Failed to purge caches`),
  });

  const disabled = purgeMetadata.isPending || purgeImages.isPending || purgeAll.isPending;

  return (
    <CardContent>
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <IconTrash aria-hidden={true} className="text-primary size-4" />
        </div>
        <div className="flex-1">
          <CardTitle>
            <Trans>Cache management</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Free up disk space by clearing cached metadata and images</Trans>
          </CardDescription>

          <div className="mt-4 flex flex-wrap gap-2">
            {/* Purge metadata */}
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" disabled={disabled} />}>
                {purgeMetadata.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <IconDatabase aria-hidden={true} />
                )}
                {purgeMetadata.isPending ? (
                  <Trans>Purging...</Trans>
                ) : (
                  <Trans>Purge metadata</Trans>
                )}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <Trans>Purge metadata cache?</Trans>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <Trans>
                      This will delete un-enriched stub titles that aren't in any user's library and
                      clean up orphaned person records. Deleted titles will be re-imported if
                      accessed again.
                    </Trans>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    <Trans>Cancel</Trans>
                  </AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => purgeMetadata.mutate()}>
                    <Trans>Purge metadata</Trans>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Purge images */}
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" disabled={disabled} />}>
                {purgeImages.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <IconPhoto aria-hidden={true} />
                )}
                {purgeImages.isPending ? <Trans>Purging...</Trans> : <Trans>Purge images</Trans>}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <Trans>Purge image cache?</Trans>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <Trans>
                      This will delete all cached TMDB images from disk. Images will be
                      re-downloaded automatically as needed.
                    </Trans>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    <Trans>Cancel</Trans>
                  </AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => purgeImages.mutate()}>
                    <Trans>Purge images</Trans>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Purge all */}
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" disabled={disabled} />}>
                {purgeAll.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <IconTrash aria-hidden={true} />
                )}
                {purgeAll.isPending ? <Trans>Purging...</Trans> : <Trans>Purge all</Trans>}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <Trans>Purge all caches?</Trans>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <Trans>
                      This will delete all un-enriched stub titles and all cached images from disk.
                      Everything will be re-imported and re-downloaded as needed.
                    </Trans>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    <Trans>Cancel</Trans>
                  </AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => purgeAll.mutate()}>
                    <Trans>Purge all</Trans>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </CardContent>
  );
}
