import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For APK / static export (Capacitor wraps the `out/` folder)
  output: "export",
  images: {
    unoptimized: true,
  },
  // Keep dev server tolerant
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
