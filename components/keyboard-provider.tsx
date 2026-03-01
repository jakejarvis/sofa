"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

export interface ShortcutDef {
  keys: string[];
  description: string;
  action: () => void;
  scope?: string;
}

interface KeyboardContextValue {
  shortcutsRef: React.RefObject<Map<string, ShortcutDef>>;
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
  const shortcutsRef = useRef<Map<string, ShortcutDef>>(new Map());
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const commandPaletteOpenRef = useRef(false);
  commandPaletteOpenRef.current = commandPaletteOpen;
  const pendingKeyRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerShortcut = useCallback((id: string, def: ShortcutDef) => {
    shortcutsRef.current.set(id, def);
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    shortcutsRef.current.delete(id);
  }, []);

  // Cmd/Ctrl+K: toggle command palette (always works, even in inputs)
  useHotkeys("mod+k", () => setCommandPaletteOpen((prev) => !prev), {
    preventDefault: true,
    enableOnFormTags: ["INPUT", "TEXTAREA"],
    enableOnContentEditable: true,
  });

  // Registered shortcuts handler (single keys + key sequences)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isInput =
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable;

      if (isInput && e.key !== "Escape") return;
      if (commandPaletteOpenRef.current && e.key !== "Escape") return;

      const shortcuts = shortcutsRef.current;

      if (pendingKeyRef.current) {
        const firstKey = pendingKeyRef.current;
        pendingKeyRef.current = null;
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        for (const def of shortcuts.values()) {
          if (
            def.keys.length === 2 &&
            def.keys[0] === firstKey &&
            def.keys[1] === e.key
          ) {
            e.preventDefault();
            def.action();
            return;
          }
        }
      }

      for (const def of shortcuts.values()) {
        if (def.keys.length === 1 && def.keys[0] === e.key) {
          e.preventDefault();
          def.action();
          return;
        }
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
  }, []);

  return (
    <KeyboardContext.Provider
      value={{
        shortcutsRef,
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
