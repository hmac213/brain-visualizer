import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Don't fail builds on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail builds on TypeScript errors
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:5001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
