/* eslint-disable @typescript-eslint/no-require-imports */
const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? require("@next/bundle-analyzer")({ enabled: true })
    : (config) => config;

const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone", // Required for production Docker builds
  eslint: {
    // Disable ESLint during builds since it's run separately in CI
    ignoreDuringBuilds: true,
  },
  experimental: {
    outputFileTracingRoot: path.resolve(__dirname),
    memoryBasedWorkersCount: true,
  },
  compiler: {
    reactRemoveProperties: process.env.NODE_ENV === "production",
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Increase memory limit if needed
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  webpack: (config, { isServer }) => {
    // Explicitly configure path aliases for webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };

    // Handle react-pdf dependencies for client-side only
    if (!isServer) {
      // Add fallbacks for Node.js modules that react-pdf uses but aren't in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        stream: false,
        path: false,
      };
    }

    // Ensure @react-pdf/renderer is properly resolved
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, "node_modules"),
    ];

    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
