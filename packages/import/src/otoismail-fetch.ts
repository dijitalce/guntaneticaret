import { createWriteStream } from "node:fs";
import { rename } from "node:fs/promises";
import type { OtoIsmailRaw } from "./otoismail-map";

const DEFAULT_BASE = "http://ws.otoismail.com.tr/api/OISML";

export type OtoIsmailConfig = { username: string; password: string; base: string };

export function otoIsmailConfigFromEnv(): OtoIsmailConfig | null {
  const { OTOISMAIL_USERNAME, OTOISMAIL_PASSWORD } = process.env;
  if (!OTOISMAIL_USERNAME || !OTOISMAIL_PASSWORD) return null;
  return {
    username: OTOISMAIL_USERNAME,
    password: OTOISMAIL_PASSWORD,
    base: (process.env.OTOISMAIL_BASE || DEFAULT_BASE).replace(/\/$/, ""),
  };
}

type Envelope<T> = { Result?: { success?: boolean; message?: string | null; rowcount?: number }; Data?: T };

export class OtoIsmailClient {
  private token = "";

  constructor(private readonly config: OtoIsmailConfig) {}

  private async call<T>(path: string, params: Record<string, string>, auth: boolean, timeoutMs: number): Promise<Envelope<T>> {
    const url = `${this.config.base}/${path}?${new URLSearchParams(params)}`;
    const res = await fetch(url, {
      headers: auth ? { token: this.token } : {},
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`OtoIsmail ${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
    let body: Envelope<T>;
    try {
      body = JSON.parse(text) as Envelope<T>;
    } catch {
      throw new Error(`OtoIsmail ${path} JSON değil: ${text.slice(0, 200)}`);
    }
    if (body.Result?.success === false) throw new Error(`OtoIsmail ${path}: ${body.Result.message ?? "başarısız"}`);
    return body;
  }

  async login() {
    const body = await this.call<string>("Login", { pUsername: this.config.username, pPwd: this.config.password }, false, 30_000);
    if (!body.Data) throw new Error("OtoIsmail login: token gelmedi");
    this.token = body.Data;
  }

  async brands(): Promise<Array<{ Kod: string; Aciklama: string }>> {
    const body = await this.call<Array<{ Kod: string; Aciklama: string }>>("GetBrands", {}, true, 60_000);
    return (body.Data ?? []).map((b) => ({ Kod: b.Kod.trim(), Aciklama: b.Aciklama.trim() }));
  }

  async products(brand: string, sinceYmd = "19000101"): Promise<OtoIsmailRaw[]> {
    const body = await this.call<OtoIsmailRaw[]>("GetProducts", { pBrand: brand, pTarih: sinceYmd }, true, 15 * 60_000);
    return body.Data ?? [];
  }
}

/** Markanın tüm ürünlerini satır başına bir JSON olarak yazar (import ve görsel eşleme akıştan okur). */
export async function writeNdjson(path: string, rows: OtoIsmailRaw[]): Promise<void> {
  const tmp = `${path}.tmp`;
  const out = createWriteStream(tmp, { encoding: "utf8" });
  for (const row of rows) {
    if (!out.write(`${JSON.stringify(row)}\n`)) await new Promise<void>((r) => out.once("drain", () => r()));
  }
  await new Promise<void>((resolve, reject) => {
    out.once("error", reject);
    out.end(resolve);
  });
  await rename(tmp, path);
}
