"use client";

import { useKeyboard } from "@/components/keyboard-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

export function KeyboardHelpDialog() {
  const { shortcuts, helpOpen, setHelpOpen } = useKeyboard();

  // Group shortcuts by scope
  const grouped: Record<string, { description: string; keys: string[] }[]> = {};
  for (const def of shortcuts.values()) {
    const scope = def.scope ?? "Global";
    if (!grouped[scope]) grouped[scope] = [];
    grouped[scope].push({ description: def.description, keys: def.keys });
  }

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {Object.entries(grouped).map(([scope, items]) => (
            <div key={scope} className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {scope}
              </h3>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between rounded-md px-2 py-1.5"
                  >
                    <span className="text-xs text-foreground">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <span key={key} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              then
                            </span>
                          )}
                          <Kbd>{formatKey(key)}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatKey(key: string): string {
  const map: Record<string, string> = {
    " ": "Space",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  };
  return map[key] ?? key.toUpperCase();
}
