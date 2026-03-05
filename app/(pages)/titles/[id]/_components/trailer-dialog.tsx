"use client";

import { IconPlayerPlayFilled } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function TrailerDialog({ videoKey }: { videoKey: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      import("youtube-video-element");
      import("@player.style/sutro");
      setLoaded(true);
    }
  }, [open, loaded]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-5 items-center gap-1 rounded border border-border/50 px-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <IconPlayerPlayFilled className="h-2.5 w-2.5" />
        Trailer
      </button>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl p-0 overflow-hidden bg-black border-white/10"
      >
        <DialogTitle className="sr-only">Trailer</DialogTitle>
        <div className="aspect-video w-full">
          {loaded && (
            // @ts-expect-error -- web components not in JSX types
            <media-theme-sutro
              style={{
                width: "100%",
                height: "100%",
                "--media-primary-color": "hsl(35 100% 66%)",
                "--media-accent-color": "hsl(35 100% 66%)",
              }}
            >
              {/* @ts-expect-error -- web component */}
              <youtube-video
                slot="media"
                src={`https://www.youtube.com/watch?v=${videoKey}`}
                crossorigin=""
              />
              {/* @ts-expect-error -- web component */}
            </media-theme-sutro>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
