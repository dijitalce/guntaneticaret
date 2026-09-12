import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { NextConfig } from "next";

const require = createRequire(__filename);
const repoRoot = path.join(__dirname, "../..");

function pkgDir(name: string, from?: string) {
  const req = from ? createRequire(from) : require;
  let dir = path.dirname(req.resolve(name));
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    dir = path.dirname(dir);
  }
  return dir;
}

function optionalPkgDir(name: string, from?: string) {
  try {
    return pkgDir(name, from);
  } catch {
    return undefined;
  }
}

// Canlıda ana site yolu: /yonetim (subdomain gerekmez).
// Yerel `next dev` için boş bırak (localhost:3001).
const adminBasePath =
  process.env.ADMIN_BASE_PATH ??
  (process.env.NODE_ENV === "production" ? "/yonetim" : "");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
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
  images: {
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED !== "false",
    remotePatterns: [{ protocol: "http", hostname: "localhost" }, { protocol: "https", hostname: "**" }],
  },
  // ioredis'i bundle'la; Hostinger nested node_modules @ioredis/commands'u düşürüyor.
  serverExternalPackages: ["mysql2", "bullmq", "meilisearch"],
  webpack: (config) => {
    config.resolve.modules = [
      path.join(repoRoot, "node_modules"),
      path.join(__dirname, "node_modules"),
      ...(config.resolve.modules ?? ["node_modules"]),
    ];
    const ioredisPkg = optionalPkgDir("ioredis");
    const ioredisPkgJson = ioredisPkg ? path.join(ioredisPkg, "package.json") : undefined;
    config.resolve.alias = {
      ...config.resolve.alias,
      "drizzle-orm": pkgDir("drizzle-orm"),
      mysql2: pkgDir("mysql2"),
      ...(ioredisPkg ? { ioredis: ioredisPkg } : {}),
      ...(ioredisPkgJson
        ? { "@ioredis/commands": optionalPkgDir("@ioredis/commands", ioredisPkgJson) }
        : {}),
    };
    const alias = config.resolve.alias as Record<string, unknown>;
    for (const [key, value] of Object.entries(alias)) {
      if (!value) delete alias[key];
    }
    return config;
  },
};

export default nextConfig;
