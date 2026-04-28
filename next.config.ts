import type { NextConfig } from "next";

const backendApiOrigin = (process.env.BACKEND_API_ORIGIN ?? "https://extrema-stcg.onrender.com").replace(
  /\/+$/,
  ""
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    workerThreads: true,
    webpackBuildWorker: false
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendApiOrigin}/api/v1/:path*`
      }
    ];
  }
};

export default nextConfig;
