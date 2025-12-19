import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Optimize for production
  reactStrictMode: true,
  
  // Production-specific optimizations
  ...(isProduction && {
    compress: true,
    poweredByHeader: false,
  }),
  
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['@solana/web3.js', 'framer-motion'],
  },
  
  // Environment-based cache control headers
  async headers() {
    const cacheControl = isProduction
      ? 'public, s-maxage=300, stale-while-revalidate=600'
      : 'no-store, must-revalidate';

    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: cacheControl,
          },
          {
            key: 'X-Environment',
            value: isProduction ? 'production' : 'development',
          },
          ...(isVercel ? [{ key: 'X-Platform', value: 'vercel' }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
