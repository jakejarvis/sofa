import { simkl } from "./simkl";
import { trakt } from "./trakt";
import type { ImportProvider } from "./types";

const providers: Record<string, ImportProvider> = {
  trakt,
  simkl,
};

export function getProvider(name: string): ImportProvider | undefined {
  return providers[name];
}

export function getProviderConfig(name: string): {
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
