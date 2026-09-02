import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@guntan/auth",
    "@guntan/catalog",
    "@guntan/config",
    "@guntan/db",
    "@guntan/ecommerce",
    "@guntan/email",
    "@guntan/search",
    "@guntan/tenant",
    "@guntan/types",
    "@guntan/ui",
  ],
  images: { remotePatterns: [{ protocol: "http", hostname: "localhost" }, { protocol: "https", hostname: "**" }] },
  serverExternalPackages: ["postgres", "ioredis", "bullmq", "meilisearch", "saxes", "drizzle-orm"],
};

export default nextConfig;
