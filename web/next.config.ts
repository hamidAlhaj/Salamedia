import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  experimental: {
    // Videos (up to 50 MB) are forwarded to the API through Server Actions.
    serverActions: { bodySizeLimit: "60mb" },
  },
  // Put the LAN IP here for phone testing in `next dev`, e.g. ["192.168.1.180"].
  allowedDevOrigins: [],
  async rewrites() {
    // Same-origin media URLs (works from a phone on the LAN). Range requests pass through.
    return [{ source: "/media/:path*", destination: `${API_URL}/media/:path*` }];
  },
};

export default nextConfig;
