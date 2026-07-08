import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Remove the X-Powered-By header (tiny perf + security win)
  poweredByHeader: false,
  // Enable gzip + brotli compression for responses (on by default, explicit)
  compress: true,
  serverExternalPackages: ["@prisma/client", "@libsql/client", "@prisma/adapter-libsql"],
  experimental: {
    // Tree-shake unused named exports from heavy barrel-export packages.
    // lucide-react alone exports 1000+ icons; without this every icon can end
    // up in the bundle. recharts exports many chart types the same way.
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
      "recharts",
      "@tanstack/react-table",
      "@tanstack/react-query",
      "react-hook-form",
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ]
  },
};

export default nextConfig;
