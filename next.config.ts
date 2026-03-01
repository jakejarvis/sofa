import type { NextConfig } from "next";

const imageBaseUrl = process.env.TMDB_IMAGE_BASE_URL || "";
const imageHost = imageBaseUrl
  ? new URL(imageBaseUrl).hostname
  : "image.tmdb.org";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  env: {
    TMDB_IMAGE_BASE_URL: process.env.TMDB_IMAGE_BASE_URL || "",
  },
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
