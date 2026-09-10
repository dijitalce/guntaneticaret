import type { NextConfig } from "next";

// Canlıda ana site yolu: /yonetim (subdomain gerekmez).
// Yerel `next dev` için boş bırak (localhost:3001).
const adminBasePath =
  process.env.ADMIN_BASE_PATH ??
  (process.env.NODE_ENV === "production" ? "/yonetim" : "");

const nextConfig: NextConfig = {
  basePath: adminBasePath || undefined,
  env: {
    NEXT_PUBLIC_ADMIN_BASE_PATH: adminBasePath,
    ADMIN_BASE_PATH: adminBasePath,
  },
  transpilePackages: [
    "@guntan/auth",
    "@guntan/config",
    "@guntan/db",
    "@guntan/ecommerce",
    "@guntan/import",
    "@guntan/observability",
    "@guntan/search",
    "@guntan/tenant",
    "@guntan/types",
    "@guntan/ui",
  ],
  serverExternalPackages: ["mysql2", "ioredis", "bullmq", "meilisearch"],
};

export default nextConfig;
