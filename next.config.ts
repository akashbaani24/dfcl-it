import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel-এ deploy করার সময় standalone ব্যবহার করতে হবে না — Vercel নিজে handle করে
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma generate করা client-কে bundle করতে দিন
  serverExternalPackages: ["@prisma/client", "@libsql/client", "@prisma/adapter-libsql"],
};

export default nextConfig;
