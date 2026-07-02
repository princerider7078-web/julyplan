import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone build (with API routes for AI proxy)
  output: "standalone",
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
