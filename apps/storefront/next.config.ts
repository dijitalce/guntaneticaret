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
  // Hostinger shared Node plans count image-optimizer / sharp work toward the
  // "Maksimum İşlem" process cap. Serve images as-is unless explicitly enabled.
  images: {
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED !== "false",
    remotePatterns: [{ protocol: "http", hostname: "localhost" }, { protocol: "https", hostname: "**" }],
  },
  // ioredis Hostinger'da apps/storefront/node_modules/ioredis olarak kopyalanıyor
  // ama @ioredis/commands gelmiyor. Paketi bundle'la; native olanları dışarıda bırak.
  serverExternalPackages: ["mysql2", "bullmq", "meilisearch", "saxes"],
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  webpack: (config) => {
    config.resolve.modules = [
      path.join(repoRoot, "node_modules"),
      path.join(__dirname, "node_modules"),
      ...(config.resolve.modules ?? ["node_modules"]),
    ];
    const extra: Record<string, string> = {
      "drizzle-orm": pkgDir("drizzle-orm"),
      mysql2: pkgDir("mysql2"),
      zod: pkgDir("zod"),
    };
    const ioredisPkg = optionalPkgDir("ioredis");
    if (ioredisPkg) extra.ioredis = ioredisPkg;
    const commands = ioredisPkg
      ? optionalPkgDir("@ioredis/commands", path.join(ioredisPkg, "package.json"))
      : undefined;
    if (commands) extra["@ioredis/commands"] = commands;

    // Next aliases `private-next-empty-module: false`. Never strip falsy aliases.
    const prev = config.resolve.alias;
    config.resolve.alias = Array.isArray(prev) ? [...prev, extra] : { ...prev, ...extra };
    return config;
  },
};

export default nextConfig;
