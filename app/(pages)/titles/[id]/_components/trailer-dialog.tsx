"use client";

import { IconPlayerPlayFilled } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const YoutubeVideo = dynamic(() => import("youtube-video-element/react"), {
  ssr: false,
});
const MediaThemeSutro = dynamic(() => import("@player.style/sutro/react"), {
  ssr: false,
});

export function TrailerDialog({
  videoKey,
  variant = "badge",
}: {
  videoKey: string;
  variant?: "badge" | "backdrop";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "backdrop" ? (
        <button
          type="button"
          aria-label="Play trailer"
          onClick={() => setOpen(true)}
          className="group flex size-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-md transition-[transform,background-color,box-shadow] duration-300 hover:scale-105 hover:bg-white/20 hover:ring-white/30 active:scale-100 sm:size-16"
        >
          <IconPlayerPlayFilled className="size-6 text-white drop-shadow-lg sm:size-8" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-5 items-center gap-1 rounded border border-border/50 px-2 text-muted-foreground text-xs transition-colors hover:border-border hover:text-foreground"
        >
          <IconPlayerPlayFilled aria-hidden={true} className="h-2.5 w-2.5" />
          Trailer
        </button>
      )}
      <DialogContent className="overflow-hidden border-white/10 bg-black p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Trailer</DialogTitle>
        <div className="aspect-video w-full">
          <MediaThemeSutro
            style={
              {
                width: "100%",
                height: "100%",
              } as React.CSSProperties
            }
          >
            <YoutubeVideo
              slot="media"
              src={`https://www.youtube-nocookie.com/watch?v=${videoKey}`}
              playsInline
              crossOrigin="anonymous"
            />
          </MediaThemeSutro>
        </div>
      </DialogContent>
    </Dialog>
  );
}
