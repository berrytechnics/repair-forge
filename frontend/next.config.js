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
  transpilePackages: ["@square/web-sdk"],
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
      "@square/web-sdk$": path.resolve(__dirname, "node_modules/@square/web-sdk/dist/index.js"),
    };

    // Ensure webpack respects package.json exports field
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
      ".jsx": [".jsx", ".tsx"],
    };

    // Handle client-side dependencies
    if (!isServer) {
      // Add fallbacks for Node.js modules that aren't available in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        stream: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        crypto: false,
        util: false,
        url: false,
        querystring: false,
        os: false,
        buffer: false,
        process: false,
      };
    }

    // Ensure @react-pdf/renderer is properly resolved
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, "node_modules"),
    ];

    // Ensure proper module resolution for ES modules
    // Prioritize browser builds for client-side code
    if (!isServer) {
      config.resolve.conditionNames = ["browser", "import", "require", "default"];
      config.resolve.mainFields = ["browser", "module", "main"];
    } else {
      config.resolve.conditionNames = ["import", "require", "default"];
    }
    
    // Ensure webpack can resolve ES modules with exports field
    config.resolve.fullySpecified = false;

    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
