import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Dedicated, argument-free entry point for hosts (like Hostinger's "Application
// startup file" field) that execute a single JS file directly with `node`
// rather than running an npm script. Always starts the storefront in
// production mode, regardless of how it's invoked.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "apps/storefront/package.json"));
const nextBin = require.resolve("next/dist/bin/next");

const result = spawnSync(
  process.execPath,
  [nextBin, "start", "--hostname", "0.0.0.0", "--port", process.env.PORT ?? "3000"],
  {
    cwd: join(root, "apps/storefront"),
    stdio: "inherit",
    env: process.env,
  }
);

process.exit(result.status ?? 1);
