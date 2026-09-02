import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "apps/storefront/package.json"));
const nextBin = require.resolve("next/dist/bin/next");
const cmd = process.argv[2] ?? "build";
const extra = cmd === "start"
  ? ["--hostname", "0.0.0.0", "--port", process.env.PORT ?? "3000"]
  : [];

const result = spawnSync(process.execPath, [nextBin, cmd, ...extra], {
  cwd: join(root, "apps/storefront"),
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
