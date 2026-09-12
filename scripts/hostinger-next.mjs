import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "apps/storefront/package.json"));
const nextBin = require.resolve("next/dist/bin/next");
const cmd = process.argv[2] ?? "build";

function buildEnv() {
  return {
    ...process.env,
    // Force stub DB pool during next build page-data collection (see packages/db client).
    GUNTAN_NEXT_BUILD: "1",
  };
}

function runNext(appRel, args) {
  console.log(`[hostinger-next] Building ${appRel}...`);
  const result = spawnSync(process.execPath, [nextBin, ...args], {
    cwd: join(root, appRel),
    stdio: "inherit",
    env: buildEnv(),
  });
  const code = result.status ?? 1;
  if (code !== 0) {
    console.error(`[hostinger-next] ${appRel} failed with exit code ${code}`);
  }
  return code;
}

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

if (cmd === "start") {
  // Tek süreç; listen() 3 sn kuralı için doğrudan start dosyası.
  await import(pathToFileURL(join(root, "scripts/hostinger-start.mjs")).href);
} else if (cmd === "build") {
  const sf = runNext("apps/storefront", ["build"]);
  if (sf !== 0) process.exit(sf);
  const adm = runNext("apps/admin", ["build"]);
  if (adm !== 0) process.exit(adm);

  // Bazı hostlar kökte .next arar; vitrin çıktısını aynala.
  linkOrCopy(join(root, "apps/storefront/.next"), join(root, ".next"));
  process.exit(0);
} else {
  process.exit(runNext("apps/storefront", [cmd]));
}
