const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/jakejarvis/sofa/releases/latest";

export interface VersionInfo {
  version: string;
  releaseUrl: string;
}

export async function getLatestVersion(): Promise<VersionInfo> {
  const res = await fetch(GITHUB_RELEASES_URL, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "sofa-public-api",
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);

  const data = (await res.json()) as {
    tag_name: string;
    html_url: string;
  };

  return {
    version: data.tag_name.replace(/^v/, ""),
    releaseUrl: data.html_url,
  };
}
