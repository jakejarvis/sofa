import { atom } from "jotai";
import type { SystemHealthData } from "@/lib/services/system-health";

export const systemHealthDataAtom = atom<SystemHealthData>(
  undefined as unknown as SystemHealthData,
);
export const systemHealthRefreshingAtom = atom(false);
