import type { NormalizedImport } from "@sofa/api/schemas";

export type { NormalizedImport };

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export type PollResult =
  | { status: "pending" }
  | { status: "authorized"; accessToken: string }
  | { status: "expired" }
  | { status: "denied" };

export interface ImportProvider {
  getDeviceCode(clientId: string, clientSecret: string): Promise<DeviceCodeResponse>;
  pollForToken(clientId: string, clientSecret: string, deviceCode: string): Promise<PollResult>;
  fetchUserData(accessToken: string, clientId: string): Promise<NormalizedImport>;
}
