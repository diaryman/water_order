import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  optimizeFonts: false, // Fix for some docker issue
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
