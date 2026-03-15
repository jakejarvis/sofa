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
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function CacheSection() {
  const queryClient = useQueryClient();

  const invalidateHealth = () =>
    queryClient.invalidateQueries({ queryKey: orpc.system.health.key() });

  const purgeMetadata = useMutation(
    orpc.admin.purgeMetadataCache.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          `Purged ${data.deletedTitles} stale title${data.deletedTitles !== 1 ? "s" : ""} and ${data.deletedPersons} orphaned person${data.deletedPersons !== 1 ? "s" : ""}`,
        );
        invalidateHealth();
      },
      onError: () => toast.error("Failed to purge metadata cache"),
    }),
  );

  const purgeImages = useMutation(
    orpc.admin.purgeImageCache.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          `Deleted ${data.deletedFiles.toLocaleString()} file${data.deletedFiles !== 1 ? "s" : ""}, freed ${formatBytes(data.freedBytes)}`,
        );
        invalidateHealth();
      },
      onError: () => toast.error("Failed to purge image cache"),
    }),
  );

  const purgeAll = useMutation({
    mutationFn: () =>
      Promise.all([
        client.admin.purgeMetadataCache(),
        client.admin.purgeImageCache(),
      ]),
    onSuccess: ([metaResult, imageResult]) => {
      toast.success(
        `Purged ${metaResult.deletedTitles} title${metaResult.deletedTitles !== 1 ? "s" : ""}, ${metaResult.deletedPersons} person${metaResult.deletedPersons !== 1 ? "s" : ""}, ${imageResult.deletedFiles.toLocaleString()} file${imageResult.deletedFiles !== 1 ? "s" : ""} (${formatBytes(imageResult.freedBytes)} freed)`,
      );
      invalidateHealth();
    },
    onError: () => toast.error("Failed to purge caches"),
  });

  const disabled =
    purgeMetadata.isPending || purgeImages.isPending || purgeAll.isPending;

  return (
    <CardContent>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <IconTrash aria-hidden={true} className="size-4 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle>Cache management</CardTitle>
          <CardDescription>
            Free up disk space by clearing cached metadata and images
          </CardDescription>

          <div className="mt-4 flex flex-wrap gap-2">
            {/* Purge metadata */}
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="outline" size="sm" disabled={disabled} />
                }
              >
                {purgeMetadata.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <IconDatabase aria-hidden={true} />
                )}
                {purgeMetadata.isPending ? "Purging…" : "Purge metadata"}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Purge metadata cache?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete un-enriched stub titles that aren't in any
                    user's library and clean up orphaned person records. Deleted
                    titles will be re-imported if accessed again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => purgeMetadata.mutate()}
                  >
                    Purge metadata
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Purge images */}
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="outline" size="sm" disabled={disabled} />
                }
              >
                {purgeImages.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <IconPhoto aria-hidden={true} />
                )}
                {purgeImages.isPending ? "Purging…" : "Purge images"}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Purge image cache?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all cached TMDB images from disk. Images
                    will be re-downloaded automatically as needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => purgeImages.mutate()}
                  >
                    Purge images
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Purge all */}
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" size="sm" disabled={disabled} />
                }
              >
                {purgeAll.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <IconTrash aria-hidden={true} />
                )}
                {purgeAll.isPending ? "Purging…" : "Purge all"}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Purge all caches?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all un-enriched stub titles and all cached
                    images from disk. Everything will be re-imported and
                    re-downloaded as needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => purgeAll.mutate()}
                  >
                    Purge all
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
