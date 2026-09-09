/** @type {import('next').NextConfig} */
module.exports = {
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,

  // Enable React Compiler for better runtime performance. (Next 16 moved
  // this out of `experimental` — it used to silently no-op there.)
  reactCompiler: true,

  // Optimize images served from Sleeper's CDN (avatars, player headshots,
  // team logos) if/when they're switched from raw <img> to next/image.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sleepercdn.com",
        pathname: "/**",
      },
    ],
  },

  // Bundle optimization
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Compress responses
  compress: true,

  // Power-only mode for static optimization
  poweredByHeader: false,
};
