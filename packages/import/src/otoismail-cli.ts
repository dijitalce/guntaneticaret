/**
 * Oto İsmail senkronu giriş noktası. Veritabanı istemcisi ortam değişkenleriyle oluşturulduğu için
 * ayar dosyası (guntan-sync.env) @guntan/db yüklenmeden ÖNCE okunmalı; asıl iş otoismail-run.ts'dedir.
 * Kullanım ve bayraklar için otoismail-run.ts başlığına bakın.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSyncEnv } from "./sync-env";

loadSyncEnv(join(dirname(fileURLToPath(import.meta.url)), "../../.."));
await import("./otoismail-run");
