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

// Hosts like Hostinger look for the Next.js output directory (".next") at the
// repo root after the build step. Our build actually runs inside
// apps/storefront, so mirror the output at the root to satisfy that check.
if (cmd === "build" && (result.status ?? 1) === 0) {
  const source = join(root, "apps/storefront/.next");
  const target = join(root, ".next");

  try {
    fs.rmSync(target, { recursive: true, force: true });
    fs.symlinkSync(source, target, "dir");
    console.log(`[hostinger-next] Linked ${target} -> ${source}`);
  } catch (err) {
    console.warn(`[hostinger-next] Symlink failed (${err.message}), copying instead...`);
    try {
      fs.rmSync(target, { recursive: true, force: true });
      fs.cpSync(source, target, { recursive: true });
      console.log(`[hostinger-next] Copied ${source} -> ${target}`);
    } catch (copyErr) {
      console.error(`[hostinger-next] Failed to mirror .next at root: ${copyErr.message}`);
    }
  }
}

process.exit(result.status ?? 1);
