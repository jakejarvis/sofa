import { execSync } from "node:child_process";
import type { NextConfig } from "next";

process.env.GIT_COMMIT_SHA = (() => {
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch {
    return "unknown";
  }
})();

const imageBaseUrl = process.env.TMDB_IMAGE_BASE_URL || "";
const imageHost = imageBaseUrl
  ? new URL(imageBaseUrl).hostname
  : "image.tmdb.org";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: imageHost,
      },
    ],
  },
};

export default nextConfig;
