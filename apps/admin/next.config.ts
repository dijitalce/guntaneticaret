import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  serverExternalPackages: ["postgres", "ioredis", "bullmq", "meilisearch"],
};

export default nextConfig;
