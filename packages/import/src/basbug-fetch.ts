import { rename, writeFile } from "node:fs/promises";
import type { BasbugFile, BasbugRaw } from "./basbug-map";

const BASE = "https://api.basbug.com.tr";
/** Servis başına dakikada 10 istek sınırı. */
const MIN_GAP_MS = 6_500;
const REFRESH_BEFORE_MS = 60_000;

export type BasbugConfig = {
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  firma: string;
  depo: string;
};

export function basbugConfigFromEnv(): BasbugConfig | null {
  const { BASBUG_USERNAME, BASBUG_PASSWORD, BASBUG_CLIENT_SECRET } = process.env;
  if (!BASBUG_USERNAME || !BASBUG_PASSWORD || !BASBUG_CLIENT_SECRET) return null;
  return {
    username: BASBUG_USERNAME,
    password: BASBUG_PASSWORD,
    clientId: process.env.BASBUG_CLIENT_ID || "materialApi",
    clientSecret: BASBUG_CLIENT_SECRET,
    firma: process.env.BASBUG_FIRMA || "BASBUG",
    depo: process.env.BASBUG_DEPO || "MRK",
  };
}

type TokenResponse = { token: string; refreshToken: string; tokenBitisSuresi: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class BasbugClient {
  private token = "";
  private refreshToken = "";
  private expiresAt = 0;
  private lastCall = new Map<string, number>();

  constructor(private readonly config: BasbugConfig) {}

  private setToken(res: TokenResponse) {
    this.token = res.token;
    this.refreshToken = res.refreshToken;
    this.expiresAt = Date.now() + res.tokenBitisSuresi * 1000;
  }

  private async post<T>(path: string, body: unknown, auth = false): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Basbug ${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text) as T;
  }

  async login() {
    this.setToken(
      await this.post<TokenResponse>("/auth/Login", {
        kullaniciAdi: this.config.username,
        parola: this.config.password,
        clientSecret: this.config.clientSecret,
        clientID: this.config.clientId,
      }),
    );
  }

  private async ensureToken() {
    if (Date.now() < this.expiresAt - REFRESH_BEFORE_MS) return;
    try {
      this.setToken(
        await this.post<TokenResponse>("/auth/RefreshToken", {
          refreshToken: this.refreshToken,
          clientID: this.config.clientId,
          clientSecret: this.config.clientSecret,
        }),
      );
    } catch {
      await this.login();
    }
  }

  async logout() {
    if (!this.token) return;
    await this.post(
      "/auth/Logout",
      {
        accessToken: this.token,
        refreshToken: this.refreshToken,
        clientSecret: this.config.clientSecret,
        clientID: this.config.clientId,
      },
      true,
    );
    this.token = "";
  }

  async get<T>(method: string, params: Record<string, string>): Promise<T> {
    const wait = (this.lastCall.get(method) ?? 0) + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    await this.ensureToken();
    this.lastCall.set(method, Date.now());
    const qs = new URLSearchParams({ FirmaAdi: this.config.firma, ...params });
    const res = await fetch(`${BASE}/material/${method}?${qs}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      signal: AbortSignal.timeout(180_000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Basbug ${method} ${params.ListeGrubu ?? ""} HTTP ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text) as T;
  }
}

function rate(list: Array<{ dovizCinsi: string; satis: string }>, code: string): number | undefined {
  const n = Number(list.find((d) => d.dovizCinsi === code)?.satis);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Tüm liste gruplarının malzeme + net fiyat + stok bilgisini çekip
 * basbug-cli'nin okuduğu all_products.json biçiminde yazar.
 */
export async function fetchBasbugCatalog(
  config: BasbugConfig,
  outPath: string,
  { minItems = 10_000 } = {},
): Promise<{ items: number; groups: number; doviz: BasbugFile["_doviz"] }> {
  const client = new BasbugClient(config);
  await client.login();
  try {
    const { malzemeGruplariListesi: groups } = await client.get<{
      malzemeGruplariListesi: Array<{ kod: string; ad: string }>;
    }>("ListeGrubuGetir", {});

    const { dovizListesi } = await client.get<{
      dovizListesi: Array<{ dovizCinsi: string; satis: string }>;
    }>("DovizBilgisiGetir", {});
    const doviz = { EUR: rate(dovizListesi, "EUR"), USD: rate(dovizListesi, "USD") };

    const all: BasbugRaw[] = [];
    const seen = new Set<string>();
    for (const group of groups) {
      const { malzemeListesi } = await client.get<{ malzemeListesi: BasbugRaw[] }>("MalzemeleriGetir", {
        ListeGrubu: group.kod,
      });
      const { fiyatListesi } = await client.get<{ fiyatListesi: Array<{ no: string; nf: number }> }>(
        "FiyatGetir",
        { ListeGrubu: group.kod },
      );
      let stokListesi: Array<{ no: string; stok: number; sFarkliDepo: number }> = [];
      try {
        ({ stokListesi } = await client.get<{ stokListesi: typeof stokListesi }>("StokGetir", {
          ListeGrubu: group.kod,
          Depo: config.depo,
        }));
      } catch (err) {
        console.warn(`Stok alınamadı (${group.kod}), bu grupta stok varsayılan kalacak:`, err instanceof Error ? err.message : err);
      }

      const nf = new Map(fiyatListesi.map((f) => [f.no, f.nf]));
      const stok = new Map(stokListesi.map((s) => [s.no, s]));
      for (const row of malzemeListesi ?? []) {
        if (!row.no || seen.has(row.no)) continue;
        seen.add(row.no);
        const s = stok.get(row.no);
        all.push({
          ...row,
          nf: nf.get(row.no),
          ...(s ? { stok: s.stok, sFarkliDepo: s.sFarkliDepo } : {}),
          _listeGrubu: group.kod,
          _listeGrubuAd: group.ad,
        });
      }
      console.log(`Basbug ${group.kod}: ${malzemeListesi?.length ?? 0} malzeme, ${fiyatListesi.length} fiyat, ${stokListesi.length} stok`);
    }

    if (all.length < minItems) {
      throw new Error(`Basbug ürün adedi şüpheli düşük (${all.length}); mevcut dosya korunuyor.`);
    }

    const file: BasbugFile = { malzemeListesi: all, _doviz: doviz, _fetchedAt: new Date().toISOString() };
    const tmpPath = `${outPath}.tmp`;
    await writeFile(tmpPath, JSON.stringify(file), "utf8");
    await rename(tmpPath, outPath);
    return { items: all.length, groups: groups.length, doviz };
  } finally {
    await client.logout().catch((err) => console.warn("Basbug logout hatası:", err instanceof Error ? err.message : err));
  }
}
