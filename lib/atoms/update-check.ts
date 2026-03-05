import { atomWithStorage, createJSONStorage } from "jotai/utils";

export const updateToastShownAtom = atomWithStorage<boolean>(
  "sofa:update-toast-shown",
  false,
  createJSONStorage(() => sessionStorage),
);
