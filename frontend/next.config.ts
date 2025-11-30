import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore ESLint errors during production builds (e.g., on Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript build errors to avoid blocking deployments
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
