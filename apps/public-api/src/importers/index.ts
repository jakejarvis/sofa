import * as z from "zod";

import { simkl } from "./simkl";
import { trakt } from "./trakt";
import type { ImportProvider } from "./types";

export const ProviderEnum = z.enum(["trakt", "simkl"]);

const importers: Record<z.infer<typeof ProviderEnum>, ImportProvider> = {
  trakt,
  simkl,
};

export function getImporter(name: z.infer<typeof ProviderEnum>): ImportProvider | undefined {
  return importers[name];
}

export function getImporterConfig(name: z.infer<typeof ProviderEnum>): {
  clientId: string;
  clientSecret: string;
} {
  switch (name) {
    case "trakt":
      return {
        clientId: process.env.TRAKT_CLIENT_ID ?? "",
        clientSecret: process.env.TRAKT_CLIENT_SECRET ?? "",
      };
    case "simkl":
      return {
        clientId: process.env.SIMKL_CLIENT_ID ?? "",
        clientSecret: process.env.SIMKL_CLIENT_SECRET ?? "",
      };
    default:
      return { clientId: "", clientSecret: "" };
  }
}

export type { DeviceCodeResponse, ImportProvider } from "./types";
