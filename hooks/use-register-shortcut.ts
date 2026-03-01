import { useEffect } from "react";
import { type ShortcutDef, useKeyboard } from "@/components/keyboard-provider";

export function useRegisterShortcut(id: string, def: ShortcutDef) {
  const { registerShortcut, unregisterShortcut } = useKeyboard();

  useEffect(() => {
    registerShortcut(id, def);
  });

  useEffect(() => {
    return () => unregisterShortcut(id);
  }, [id, unregisterShortcut]);
}
