import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma generate করা client-কে bundle করতে দিন
  serverExternalPackages: ["@prisma/client", "@libsql/client", "@prisma/adapter-libsql"],
  // Performance: enable experimental features for faster runtime
  experimental: {
    // Reduce bundle size for faster cold starts
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  // Cache static pages aggressively
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
