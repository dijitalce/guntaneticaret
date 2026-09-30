import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const SYNC_ENV_NAME = "guntan-sync.env";

/**
 * Hostinger panel ortam değişkenleri cron'a geçmez; ayarlar deploy klasörü
 * dışındaki bir dosyadan okunur. Cron'un HOME'u Node uygulamasınınkinden farklı
 * olabildiği için dosya proje klasörünün üst dizinlerinde de aranır.
 */
export function syncEnvCandidates(root: string): string[] {
  const list: string[] = [];
  if (process.env.SYNC_ENV_FILE) list.push(process.env.SYNC_ENV_FILE);
  list.push(join(homedir(), SYNC_ENV_NAME));
  let dir = dirname(root);
  for (let i = 0; i < 8; i++) {
    list.push(join(dir, SYNC_ENV_NAME));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  list.push(join(root, ".env"));
  return [...new Set(list)];
}

/**
 * Log, durum ve XML dosyalarının klasörü: panelin (admin) okuduğu yerle aynı
 * olması için bulunan guntan-sync.env dosyasının klasörü, yoksa HOME.
 */
export function syncHomeDir(loaded: string[]): string {
  const envFile = loaded.find((f) => f.endsWith(`/${SYNC_ENV_NAME}`));
  return envFile ? dirname(envFile) : homedir();
}

/** Bulunan tüm dosyaları yükler; önceden tanımlı değişkenler ezilmez. */
export function loadSyncEnv(root: string): string[] {
  const loaded: string[] = [];
  for (const file of syncEnvCandidates(root)) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
      loaded.push(file);
    } catch {
      /* okunamayan dosya atlanır */
    }
  }
  return loaded;
}
