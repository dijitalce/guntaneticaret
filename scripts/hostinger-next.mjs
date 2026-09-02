import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
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

function linkOrCopy(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  try {
    fs.symlinkSync(source, target, "dir");
    console.log(`[hostinger-next] Linked ${target} -> ${source}`);
  } catch (err) {
    console.warn(`[hostinger-next] Symlink failed (${err.message}), copying instead...`);
    fs.cpSync(source, target, { recursive: true });
    console.log(`[hostinger-next] Copied ${source} -> ${target}`);
  }
}

if (cmd === "build" && (result.status ?? 1) === 0) {
  const appDir = join(root, "apps/storefront");

  // Some hosts look for the Next.js output directory (".next") at the repo
  // root after the build step. Our build actually runs inside
  // apps/storefront, so mirror the output at the root just in case.
  linkOrCopy(join(appDir, ".next"), join(root, ".next"));
}

process.exit(result.status ?? 1);
