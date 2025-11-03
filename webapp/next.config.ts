import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  // Optimize for production
  reactStrictMode: true,
};

export default nextConfig;
