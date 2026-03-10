import { createLogger } from "@/lib/logger";
import { getSetting, setSetting } from "@/lib/services/settings";

const APP_VERSION = process.env.APP_VERSION || "0.0.0";

const log = createLogger("update-check");

const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/jakejarvis/sofa/releases/latest";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string | null;
  releaseUrl: string | null;
  lastCheckedAt: string | null;
}

export function isUpdateCheckEnabled(): boolean {
  const setting = getSetting("updateCheckEnabled");
  // Default to true when no setting exists
  return setting !== "false";
}

/** @internal Returns true if `latest` is strictly newer than `current` using semver comparison. */
export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [lMajor = 0, lMinor = 0, lPatch = 0] = parse(latest);
  const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current);
  if (lMajor !== cMajor) return lMajor > cMajor;
  if (lMinor !== cMinor) return lMinor > cMinor;
  return lPatch > cPatch;
}

export function getCachedUpdateCheck(): UpdateCheckResult {
  const latestVersion = getSetting("updateCheckLatestVersion");
  const releaseUrl = getSetting("updateCheckReleaseUrl");
  const lastCheckedAt = getSetting("updateCheckLastCheckedAt");

  return {
    updateAvailable: latestVersion
      ? isNewerVersion(latestVersion, APP_VERSION)
      : false,
    currentVersion: APP_VERSION,
    latestVersion,
    releaseUrl,
    lastCheckedAt,
  };
}

export async function performUpdateCheck(): Promise<UpdateCheckResult> {
  if (!isUpdateCheckEnabled()) {
    return {
      updateAvailable: false,
      currentVersion: APP_VERSION,
      latestVersion: null,
      releaseUrl: null,
      lastCheckedAt: null,
    };
  }

  // Respect cache interval
  const lastChecked = getSetting("updateCheckLastCheckedAt");
  if (lastChecked) {
    const elapsed = Date.now() - new Date(lastChecked).getTime();
    if (elapsed < CHECK_INTERVAL_MS) {
      return getCachedUpdateCheck();
    }
  }

  try {
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "sofa-update-check",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const data = (await res.json()) as { tag_name: string; html_url: string };
    const version = data.tag_name.replace(/^v/, "");

    setSetting("updateCheckLatestVersion", version);
    setSetting("updateCheckReleaseUrl", data.html_url);
    setSetting("updateCheckLastCheckedAt", new Date().toISOString());

    log.info(
      `Update check complete: current=${APP_VERSION}, latest=${version}`,
    );

    return {
      updateAvailable: isNewerVersion(version, APP_VERSION),
      currentVersion: APP_VERSION,
      latestVersion: version,
      releaseUrl: data.html_url,
      lastCheckedAt: new Date().toISOString(),
    };
  } catch (err) {
    log.warn("Update check failed:", err);
    return getCachedUpdateCheck();
  }
}
