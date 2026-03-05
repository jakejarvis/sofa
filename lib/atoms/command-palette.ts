import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const commandPaletteOpenAtom = atom(false);
export const helpOpenAtom = atom(false);

const RECENT_KEY = "cp:recent-searches";
export const MAX_RECENT = 5;
export const recentSearchesAtom = atomWithStorage<string[]>(RECENT_KEY, []);
