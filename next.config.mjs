/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React compiler for better performance
  experimental: {
    reactCompiler: true,
  },

  // Optimize images from Sleeper CDN
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sleepercdn.com",
        pathname: "/avatars/**",
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

export default nextConfig;
