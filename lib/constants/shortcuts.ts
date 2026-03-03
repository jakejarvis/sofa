// Static shortcut descriptions for the help dialog.
// TanStack's HotkeyManager/SequenceManager handle all actual key listening.
export const SHORTCUT_DESCRIPTIONS = [
  { scope: "Global", description: "Search", keys: ["/"] },
  { scope: "Global", description: "Keyboard shortcuts", keys: ["?"] },
  { scope: "Navigation", description: "Go to dashboard", keys: ["g", "h"] },
  { scope: "Navigation", description: "Go to explore", keys: ["g", "e"] },
  { scope: "Title", description: "Cycle status", keys: ["w"] },
  { scope: "Title", description: "Mark watched", keys: ["m"] },
  { scope: "Title", description: "Go back", keys: ["Escape"] },
  { scope: "Title", description: "Rate 1 star", keys: ["1"] },
  { scope: "Title", description: "Rate 2 stars", keys: ["2"] },
  { scope: "Title", description: "Rate 3 stars", keys: ["3"] },
  { scope: "Title", description: "Rate 4 stars", keys: ["4"] },
  { scope: "Title", description: "Rate 5 stars", keys: ["5"] },
] as const;
