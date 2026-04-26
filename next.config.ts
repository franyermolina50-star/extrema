import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    workerThreads: true,
    webpackBuildWorker: false
  }
};

export default nextConfig;
