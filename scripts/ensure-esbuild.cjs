#!/usr/bin/env node
// tsx'in kullandığı esbuild ikilisini çalıştırılabilir hale getirir ve yolunu yazdırır.
// Hostinger dağıtımı node_modules içindeki çalıştırma iznini düşürdüğünde (spawn EACCES)
// ikili ev dizinine kopyalanır; çağıran bu yolu ESBUILD_BINARY_PATH olarak verir.
const { createRequire } = require("node:module");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function locate() {
  const fromImport = createRequire(path.join(root, "packages/import/package.json"));
  const fromTsx = createRequire(fromImport.resolve("tsx/package.json"));
  const esbuildPkg = fromTsx.resolve("esbuild/package.json");
  const version = JSON.parse(fs.readFileSync(esbuildPkg, "utf8")).version;
  const platformPkg = `@esbuild/${process.platform}-${process.arch}`;
  const rel = process.platform === "win32" ? "esbuild.exe" : "bin/esbuild";
  let bin;
  try {
    bin = createRequire(esbuildPkg).resolve(`${platformPkg}/${rel}`);
  } catch {
    bin = path.join(path.dirname(esbuildPkg), "..", platformPkg, rel);
  }
  return { bin, version };
}

function runs(bin, version) {
  try {
    return execFileSync(bin, ["--version"], { encoding: "utf8", timeout: 15000 }).trim() === version;
  } catch {
    return false;
  }
}

function main() {
  const { bin, version } = locate();
  if (!fs.existsSync(bin)) throw new Error(`esbuild ikilisi bulunamadı: ${bin}`);
  if (runs(bin, version)) return bin;
  try {
    fs.chmodSync(bin, 0o755);
  } catch {
    /* salt okunur olabilir; kopyaya geçilir */
  }
  if (runs(bin, version)) return bin;
  const cacheDir = path.join(os.homedir(), ".cache", "guntan");
  const copy = path.join(cacheDir, `esbuild-${version}-${process.platform}-${process.arch}`);
  if (runs(copy, version)) return copy;
  fs.mkdirSync(cacheDir, { recursive: true });
  const tmp = `${copy}.${process.pid}`;
  fs.copyFileSync(bin, tmp);
  fs.chmodSync(tmp, 0o755);
  fs.renameSync(tmp, copy);
  if (runs(copy, version)) return copy;
  throw new Error(`esbuild ${version} çalıştırılamadı (${bin} ve ${copy})`);
}

try {
  process.stdout.write(main());
} catch (err) {
  process.stderr.write(`[ensure-esbuild] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
