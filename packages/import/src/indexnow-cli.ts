/**
 * IndexNow (Bing, Yandex, Seznam, Naver): sitelerin yeni/değişen adreslerini arama motorlarına anında bildirir.
 * Adresler sitenin kendi site haritasından okunur; böylece her site yalnızca kendi görünür ürünlerini bildirir.
 * İlk çalışmada tüm adresler, sonrakilerde son başarılı çalışmadan beri lastmod'u değişenler gönderilir.
 *
 * Kullanım: pnpm --filter @guntan/import indexnow [--host alan.com] [--dry-run]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INDEXNOW_KEY, TENANT_STATUS } from "@guntan/types";
import { loadSyncEnv, syncHomeDir } from "./sync-env";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const loaded = loadSyncEnv(root);
const stateFile = join(syncHomeDir(loaded), "indexnow-state.json");

const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH = 10_000;
const DELAY_MS = 2_000;
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyHost = args.includes("--host") ? args[args.indexOf("--host") + 1] : undefined;

function log(message: string) {
  console.log(`[${new Date().toISOString()}] indexnow: ${message}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type State = Record<string, string>;

function readState(): State {
  if (!existsSync(stateFile)) return {};
  try {
    return JSON.parse(readFileSync(stateFile, "utf8")) as State;
  } catch {
    return {};
  }
}

async function siteHosts(): Promise<string[]> {
  const { pool } = await import("@guntan/db");
  const [rows] = await pool.query(
    `select d.hostname, s.social_json social
       from tenants t
       join tenant_domains d on d.tenant_id = t.id and d.is_primary = 1
       left join tenant_settings s on s.tenant_id = t.id
      where t.status = ?`,
    [TENANT_STATUS.ACTIVE],
  );
  await pool.end();
  return (rows as { hostname: string; social: unknown }[])
    .filter((r) => {
      const social = (typeof r.social === "string" ? JSON.parse(r.social) : r.social) as Record<string, string> | null;
      return social?.noindex !== "1";
    })
    .map((r) => r.hostname);
}

async function fetchText(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "guntan-indexnow/1.0" }, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

const unescapeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

async function changedUrls(host: string, since: string | undefined) {
  const index = await fetchText(`https://${host}/sitemap.xml`);
  const files = [...index.matchAll(/<sitemap><loc>([^<]+)<\/loc>/g)].map((m) => unescapeXml(m[1]!));
  const urls: string[] = [`https://${host}/`];
  for (const file of files) {
    const xml = await fetchText(file);
    for (const m of xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) {
      const lastmod = m[2];
      if (since && (!lastmod || lastmod < since)) continue;
      urls.push(unescapeXml(m[1]!));
    }
  }
  return [...new Set(urls)];
}

/** true: gönderildi; false: bu site için durdur (kota/anahtar hatası). */
async function submit(host: string, urlList: string[]) {
  if (dryRun) return true;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `https://${host}/indexnow-key.txt`, urlList }),
    signal: AbortSignal.timeout(60_000),
  });
  if (res.ok) return true;
  log(`${host}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return false;
}

const state = readState();
let exitCode = 0;
const hosts = onlyHost ? [onlyHost] : await siteHosts();
for (const host of hosts) {
  const startedAt = new Date().toISOString();
  try {
    const urls = await changedUrls(host, state[host]);
    if (urls.length <= 1 && state[host]) {
      log(`${host}: değişen adres yok.`);
      state[host] = startedAt;
      continue;
    }
    let sent = 0;
    let ok = true;
    for (let i = 0; i < urls.length; i += BATCH) {
      if (i > 0) await sleep(DELAY_MS);
      ok = await submit(host, urls.slice(i, i + BATCH));
      if (!ok) break;
      sent += Math.min(BATCH, urls.length - i);
    }
    log(`${host}: ${sent}/${urls.length} adres ${dryRun ? "(deneme) " : ""}bildirildi${state[host] ? "" : " (ilk tam gönderim)"}.`);
    if (ok) state[host] = startedAt;
    else exitCode = 1;
  } catch (err) {
    log(`${host}: ${err instanceof Error ? err.message : String(err)}`);
    exitCode = 1;
  }
  await sleep(DELAY_MS);
}
if (!dryRun) writeFileSync(stateFile, JSON.stringify(state, null, 2));
process.exit(exitCode);
