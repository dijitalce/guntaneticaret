/**
 * İkimiz Oto B2B web servisi (b2b.ikimizoto.com.tr) istemcisi.
 * Belge: "B2B Web Servis Aktan". Akış: /api/login → SessionId, sonra SessionId başlığıyla
 * /api/getProductListService (sayfalı). Ürün satırı alanları belgede "parametrik" olarak geçiyor;
 * gerçek alanları görmek için `pnpm --filter @guntan/import b2b-probe` çalıştır, ardından eşleme yazılır.
 *
 * Env: B2B_IKIMIZ_URL (varsayılan https://b2b.ikimizoto.com.tr), B2B_IKIMIZ_USERNAME, B2B_IKIMIZ_PASSWORD
 * (guntan-sync.env içine yaz; depoya KOYMA).
 */
const DEFAULT_URL = "https://b2b.ikimizoto.com.tr";

export type B2bIkimizConfig = { url: string; username: string; password: string };

export function b2bIkimizConfigFromEnv(): B2bIkimizConfig | null {
  const { B2B_IKIMIZ_USERNAME, B2B_IKIMIZ_PASSWORD } = process.env;
  if (!B2B_IKIMIZ_USERNAME || !B2B_IKIMIZ_PASSWORD) return null;
  return {
    url: (process.env.B2B_IKIMIZ_URL || DEFAULT_URL).replace(/\/$/, ""),
    username: B2B_IKIMIZ_USERNAME,
    password: B2B_IKIMIZ_PASSWORD,
  };
}

type Envelope<T> = { d?: T; data?: T; message?: { Items?: Array<{ Kind?: string; Msg?: string }> }; status?: string };

export class B2bIkimizClient {
  private sessionId = "";

  constructor(private readonly config: B2bIkimizConfig) {}

  private async post<T>(path: string, body: unknown, auth: boolean, timeoutMs: number): Promise<Envelope<T>> {
    const res = await fetch(`${this.config.url}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(auth ? { SessionId: this.sessionId } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`B2B ${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
    let json: Envelope<T>;
    try {
      json = JSON.parse(text) as Envelope<T>;
    } catch {
      throw new Error(`B2B ${path} JSON değil: ${text.slice(0, 200)}`);
    }
    if (json.status && json.status !== "succeeded") {
      const msg = json.message?.Items?.map((i) => i.Msg).filter(Boolean).join("; ");
      throw new Error(`B2B ${path} başarısız: ${msg || json.status}`);
    }
    return json;
  }

  async login(): Promise<void> {
    const res = await this.post<string>("/api/login", { Email: this.config.username, Password: this.config.password }, false, 30_000);
    if (typeof res.d !== "string" || !res.d) throw new Error("B2B login: SessionId gelmedi");
    this.sessionId = res.d;
  }

  /** Tek sayfa ürün; oturum süresi dolmuşsa bir kez yeniden giriş yapılır. */
  async productPage(pageNo: number, pageLen = 100, searchText = "", productCode = ""): Promise<unknown[]> {
    const body = { SearchText: searchText, ProductCode: productCode, PageNo: pageNo, PageLen: pageLen };
    let res: Envelope<unknown[]>;
    try {
      res = await this.post<unknown[]>("/api/getProductListService", body, true, 120_000);
    } catch (err) {
      if (!/HTTP 40[13]|oturum|session/i.test((err as Error).message)) throw err;
      await this.login();
      res = await this.post<unknown[]>("/api/getProductListService", body, true, 120_000);
    }
    return Array.isArray(res.data) ? res.data : [];
  }

  /** Boş sayfa gelene kadar tüm ürünleri sayfa sayfa verir (belleği şişirmemek için akış). */
  async *products(pageLen = 100, maxPages = 100_000): AsyncGenerator<unknown[]> {
    for (let page = 1; page <= maxPages; page++) {
      const rows = await this.productPage(page, pageLen);
      if (!rows.length) return;
      yield rows;
      if (rows.length < pageLen) return;
    }
  }
}
