import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma generate করা client-কে bundle করতে দিন
  serverExternalPackages: ["@prisma/client", "@libsql/client", "@prisma/adapter-libsql"],
  // Performance: enable experimental features
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "date-fns"],
  },
  // Cache static pages + API responses
  async headers() {
    return [
      {
        // Static assets — 1 year immutable
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
      {
        // API responses — short cache for read endpoints (5s browser, 60s CDN)
        // This helps with rapid navigation between pages
        source: "/api/resource",
        headers: [
          { key: "Cache-Control", value: "private, max-age=2, s-maxage=10" },
          { key: "Vary", value: "Cookie" },  // different users get different responses
        ],
      },
      {
        source: "/api/stock-view",
        headers: [
          { key: "Cache-Control", value: "private, max-age=2, s-maxage=10" },
          { key: "Vary", value: "Cookie" },
        ],
      },
      {
        source: "/api/auth/me",
        headers: [
          { key: "Cache-Control", value: "private, max-age=5" },
          { key: "Vary", value: "Cookie" },
        ],
      },
    ]
  },
};

export default nextConfig;
