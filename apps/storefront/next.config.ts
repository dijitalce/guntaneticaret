import path from "node:path";
import { createRequire } from "node:module";
import type { NextConfig } from "next";

const require = createRequire(__filename);
const repoRoot = path.join(__dirname, "../..");

function pkgDir(name: string) {
  return path.dirname(require.resolve(`${name}/package.json`));
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
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
  serverExternalPackages: ["postgres", "ioredis", "bullmq", "meilisearch", "saxes"],
  webpack: (config) => {
    config.resolve.modules = [
      path.join(repoRoot, "node_modules"),
      path.join(__dirname, "node_modules"),
      ...(config.resolve.modules ?? ["node_modules"]),
    ];
    config.resolve.alias = {
      ...config.resolve.alias,
      "drizzle-orm": pkgDir("drizzle-orm"),
      postgres: pkgDir("postgres"),
      ioredis: pkgDir("ioredis"),
      zod: pkgDir("zod"),
    };
    return config;
  },
};

export default nextConfig;
