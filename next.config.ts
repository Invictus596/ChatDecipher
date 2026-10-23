import type { NextConfig } from "next";

/**
 * Static export keeps the free tier fully portable: the app can be served from
 * any static host (or even a `file://`-adjacent local server) and every chat
 * byte stays inside the browser.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
