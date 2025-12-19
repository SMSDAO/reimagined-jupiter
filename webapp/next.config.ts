import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['@solana/web3.js', 'framer-motion'],
  },
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV || 'development',
  },
  
  // Cache control headers for API routes and security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Redirect configuration (if needed)
  async redirects() {
    return [];
  },
  
  // Rewrite configuration (if needed)
  async rewrites() {
    return [];
  },
};

export default nextConfig;
