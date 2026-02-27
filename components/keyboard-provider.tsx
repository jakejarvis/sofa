"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ShortcutDef {
  keys: string[];
  description: string;
  action: () => void;
  scope?: string;
}

interface KeyboardContextValue {
  shortcuts: Map<string, ShortcutDef>;
  registerShortcut: (id: string, def: ShortcutDef) => void;
  unregisterShortcut: (id: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function useKeyboard() {
  const ctx = useContext(KeyboardContext);
  if (!ctx) throw new Error("useKeyboard must be used within KeyboardProvider");
  return ctx;
}

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Map<string, ShortcutDef>>(
    () => new Map(),
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingKeyRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerShortcut = useCallback((id: string, def: ShortcutDef) => {
    setShortcuts((prev) => {
      const next = new Map(prev);
      next.set(id, def);
      return next;
    });
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isInput =
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable;

      // Cmd+K / Ctrl+K always works
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Don't fire shortcuts when typing in inputs (except Escape)
      if (isInput && e.key !== "Escape") return;

      // Don't fire when command palette is open
      if (commandPaletteOpen && e.key !== "Escape") return;

      // Check for two-key combos
      if (pendingKeyRef.current) {
        const comboKey = `${pendingKeyRef.current}+${e.key}`;
        pendingKeyRef.current = null;
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        for (const def of shortcuts.values()) {
          if (
            def.keys.length === 2 &&
            def.keys[0] === comboKey.split("+")[0] &&
            def.keys[1] === comboKey.split("+")[1]
          ) {
            e.preventDefault();
            def.action();
            return;
          }
        }
        // If no combo matched, fall through to single-key check
      }

      // Check for single-key shortcuts
      for (const def of shortcuts.values()) {
        if (def.keys.length === 1 && def.keys[0] === e.key) {
          e.preventDefault();
          def.action();
          return;
        }
        // Start combo sequence
        if (def.keys.length === 2 && def.keys[0] === e.key) {
          e.preventDefault();
          pendingKeyRef.current = e.key;
          pendingTimerRef.current = setTimeout(() => {
            pendingKeyRef.current = null;
          }, 500);
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, commandPaletteOpen]);

  return (
    <KeyboardContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        commandPaletteOpen,
        setCommandPaletteOpen,
        helpOpen,
        setHelpOpen,
      }}
    >
      {children}
    </KeyboardContext.Provider>
  );
}
