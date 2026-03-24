import { useLingui } from "@lingui/react/macro";
import { IconCheck } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

import type { Platform } from "@sofa/api/schemas";

interface PlatformGridProps {
  platforms: Platform[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function PlatformGrid({ platforms, selectedIds, onToggle }: PlatformGridProps) {
  const { t } = useLingui();

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
      {platforms.map((platform) => {
        const isSelected = selectedIds.has(platform.id);
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => onToggle(platform.id)}
            className={`group relative flex flex-col items-center gap-2 rounded-xl border p-3 motion-safe:transition-colors motion-safe:duration-150 ${
              isSelected
                ? "border-primary/50 bg-primary/8"
                : "border-border/20 hover:border-primary/30 hover:bg-primary/5"
            }`}
            aria-label={(() => {
              const name = platform.name;
              return t`Toggle ${name}`;
            })()}
            aria-pressed={isSelected}
          >
            {/* Check badge */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full"
                >
                  <IconCheck className="size-2.5" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Logo */}
            {platform.logoPath ? (
              <img
                src={platform.logoPath}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-10 rounded-lg object-cover"
              />
            ) : (
              <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg text-xs font-medium">
                {platform.name.slice(0, 2)}
              </div>
            )}

            {/* Name */}
            <span className="text-muted-foreground line-clamp-1 w-full text-center text-[11px] leading-tight">
              {platform.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
