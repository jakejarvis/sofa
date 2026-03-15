import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ["@takumi-rs/image-response"],
  reactStrictMode: true,
  turbopack: {
    // docs site is essentially self-contained from the rest of the monorepo
    root: import.meta.dirname,
  },
  async redirects() {
    return [
      {
        source: "/docs/api",
        destination: "/docs/api/account/account.removeAvatar",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
};

export default withMDX(config);
