import { atomWithStorage, createJSONStorage } from "jotai/utils";

export const updateToastDismissedVersionAtom = atomWithStorage<string | null>(
  "sofa:update-toast-dismissed-version",
  null,
  createJSONStorage(() => sessionStorage),
);
