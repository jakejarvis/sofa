import path from "node:path";
import type { NextConfig } from "next";

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@sofa/api"],
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
  rewrites: async () => [
    {
      source: "/rpc/:path*",
      destination: `${INTERNAL_API_URL}/rpc/:path*`,
    },
    {
      source: "/api/:path((?!_next).*)",
      destination: `${INTERNAL_API_URL}/api/:path*`,
    },
  ],
};

export default nextConfig;
