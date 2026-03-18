import { getTitleCount } from "@sofa/db/queries/title";
import { createLogger } from "@sofa/logger";

import { imageCacheEnabled } from "./image-cache";
import { getInstanceId, getSetting, getUserCount, setSetting } from "./settings";

const APP_VERSION = process.env.APP_VERSION || "0.0.0";
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || "https://public-api.sofa.watch";
const REPORT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

const log = createLogger("telemetry");

export function isTelemetryEnabled(): boolean {
  return getSetting("telemetryEnabled") === "true";
}

function bucketUsers(n: number): string {
  if (n <= 1) return "1";
  if (n <= 5) return "2-5";
  if (n <= 10) return "6-10";
  if (n <= 25) return "11-25";
  return "26+";
}

function bucketTitles(n: number): string {
  if (n === 0) return "0";
  if (n <= 50) return "1-50";
  if (n <= 200) return "51-200";
  if (n <= 500) return "201-500";
  return "501+";
}

export async function performTelemetryReport(): Promise<void> {
  if (!isTelemetryEnabled()) {
    log.debug("Telemetry disabled, skipping");
    return;
  }

  // Respect report interval
  const lastReported = getSetting("telemetryLastReportedAt");
  if (lastReported) {
    const elapsed = Date.now() - new Date(lastReported).getTime();
    if (elapsed < REPORT_INTERVAL_MS) {
      return;
    }
  }

  try {
    const body = {
      instanceId: getInstanceId(),
      version: APP_VERSION,
      arch: `${process.platform}-${process.arch}`,
      users: bucketUsers(getUserCount()),
      titles: bucketTitles(getTitleCount()),
      features: {
        imageCache: imageCacheEnabled(),
        oidc: !!(
          process.env.OIDC_CLIENT_ID &&
          process.env.OIDC_CLIENT_SECRET &&
          process.env.OIDC_ISSUER_URL
        ),
        scheduledBackups: getSetting("scheduledBackups") === "true",
      },
    };

    const res = await fetch(`${PUBLIC_API_URL}/v1/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "sofa-telemetry",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`Public API ${res.status}`);

    setSetting("telemetryLastReportedAt", new Date().toISOString());
    log.info("Telemetry report sent");
  } catch (err) {
    log.warn("Telemetry report failed:", err);
  }
}
