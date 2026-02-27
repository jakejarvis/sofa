import { useEffect, useMemo } from "react";
import { type ShortcutDef, useKeyboard } from "@/components/keyboard-provider";

export function useRegisterShortcut(id: string, def: ShortcutDef) {
  const { registerShortcut, unregisterShortcut } = useKeyboard();
  const keysKey = def.keys.join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable memoization on keys/description
  const stableDef = useMemo(() => def, [keysKey]);

  useEffect(() => {
    registerShortcut(id, stableDef);
    return () => unregisterShortcut(id);
  }, [id, registerShortcut, unregisterShortcut, stableDef]);
}
