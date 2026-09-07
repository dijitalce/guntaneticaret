import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "apps/storefront/package.json"));
const nextBin = require.resolve("next/dist/bin/next");
const cmd = process.argv[2] ?? "build";

function runNext(appRel, args) {
  const result = spawnSync(process.execPath, [nextBin, ...args], {
    cwd: join(root, appRel),
    stdio: "inherit",
    env: process.env,
  });
  return result.status ?? 1;
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
  // Tek süreç: Host’a göre admin veya storefront (hostinger-start.mjs).
  await import(pathToFileURL(join(root, "scripts/hostinger-start.mjs")).href);
  // hostinger-start kendi listen’ini açar; buradan çıkma.
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
