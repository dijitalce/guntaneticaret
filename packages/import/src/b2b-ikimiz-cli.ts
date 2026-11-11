/**
 * İkimiz Oto B2B senkronu giriş noktası. Veritabanı istemcisi ortam değişkenleriyle oluşturulduğu için
 * ayar dosyası (guntan-sync.env) @guntan/db yüklenmeden ÖNCE okunmalı; asıl iş b2b-ikimiz-run.ts'dedir.
 * Elle çalıştırınca dedupe + görünürlük de yapılır; sync-cli içinden B2B_IKIMIZ_STANDALONE=0 ile çağrılır.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSyncEnv } from "./sync-env";

loadSyncEnv(join(dirname(fileURLToPath(import.meta.url)), "../../.."));
process.env.B2B_IKIMIZ_STANDALONE ??= "1";
await import("./b2b-ikimiz-run");
