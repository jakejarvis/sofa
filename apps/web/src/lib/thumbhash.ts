import { thumbHashToDataURL } from "thumbhash";

export function thumbHashToUrl(hash: string | null | undefined): string | undefined {
  if (!hash) return undefined;
  const binary = Uint8Array.from(atob(hash), (c) => c.charCodeAt(0));
  return thumbHashToDataURL(binary);
}
