import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  serverActions: {
    bodySizeLimit: '10mb' // Increase limit for file uploads
  }
} as any;

export default nextConfig;
