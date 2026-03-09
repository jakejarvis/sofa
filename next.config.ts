import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.TMDB_IMAGE_BASE_URL
          ? new URL(process.env.TMDB_IMAGE_BASE_URL).hostname
          : "image.tmdb.org",
      },
    ],
  },
};

export default nextConfig;
