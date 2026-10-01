import { rename, stat, writeFile } from "node:fs/promises";

export type EryazConfig = {
  endpoint: string;
  companyKey: string;
  username: string;
  password: string;
  functionName: string;
};

export function eryazConfigFromEnv(): EryazConfig | null {
  const { ERYAZ_COMPANY_KEY, ERYAZ_USERNAME, ERYAZ_PASSWORD } = process.env;
  if (!ERYAZ_COMPANY_KEY || !ERYAZ_USERNAME || !ERYAZ_PASSWORD) return null;
  return {
    endpoint: process.env.ERYAZ_ENDPOINT || "https://share.eryaz.net/api/Integration/getdata/",
    companyKey: ERYAZ_COMPANY_KEY,
    username: ERYAZ_USERNAME,
    password: ERYAZ_PASSWORD,
    functionName: process.env.ERYAZ_FUNCTION || "GetProduct",
  };
}

/** Eryaz yanıtını doğrular; ürün adedini döner. */
export function validateEryazXml(xml: string, minItems: number): number {
  if (xml.includes("Geçersiz IP")) {
    throw new Error("Eryaz: Geçersiz IP — sunucu IP adresini destek@eryaz.net'e whitelist için iletin.");
  }
  const status = xml.match(/<Status>([^<]*)<\/Status>/)?.[1]?.trim().toLowerCase();
  if (status !== "true") {
    const message = xml.match(/<Message>([^<]*)<\/Message>/)?.[1]?.trim();
    throw new Error(`Eryaz Status=${status ?? "yok"}${message ? `: ${message}` : ""}`);
  }
  const count = Number(xml.match(/<Count>(\d+)<\/Count>/)?.[1] ?? Number.NaN);
  if (!Number.isFinite(count) || count < minItems) {
    throw new Error(`Eryaz ürün adedi şüpheli düşük (${count}); mevcut dosya korunuyor.`);
  }
  return count;
}

class RetryableError extends Error {}

/** HTML hata sayfası yerine okunur bir açıklama üretir. */
export function eryazHttpError(status: number, body: string): Error {
  const isHtml = /^\s*<(!doctype|html)/i.test(body);
  const title = isHtml ? body.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() : null;
  const detail = isHtml ? (title ? ` (${title})` : "") : `: ${body.slice(0, 200)}`;
  const text =
    status >= 500
      ? `Eryaz sunucusu geçici hata verdi (HTTP ${status})${detail}. Sorun Eryaz tarafında; bir sonraki senkronda tekrar denenir.`
      : `Eryaz HTTP ${status}${detail}`;
  return status >= 500 || status === 429 ? new RetryableError(text) : new Error(text);
}

/**
 * Eryaz GetProduct → XML dosyası. Önce geçici dosyaya yazar, doğrulanırsa
 * yerine taşır; hatalı/boş yanıt mevcut products.xml'i ezmez.
 * Sunucu hatası, zaman aşımı ve bağlantı kopmasında bekleyip tekrar dener.
 */
export async function fetchEryazXml(
  config: EryazConfig,
  outPath: string,
  {
    minItems = 1000,
    timeoutMs = 300_000,
    retryDelaysMs = [60_000, 180_000],
    onRetry,
  }: { minItems?: number; timeoutMs?: number; retryDelaysMs?: number[]; onRetry?: (attempt: number, waitMs: number, err: Error) => void } = {},
): Promise<{ count: number; bytes: number }> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(config, outPath, minItems, timeoutMs);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const retryable = e instanceof RetryableError || e.name === "TimeoutError" || e.name === "AbortError" || e instanceof TypeError;
      const wait = retryDelaysMs[attempt];
      if (!retryable || wait === undefined) throw e;
      onRetry?.(attempt + 1, wait, e);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function fetchOnce(config: EryazConfig, outPath: string, minItems: number, timeoutMs: number) {
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Accept: "application/xml",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      CompanyKey: config.companyKey,
      FunctionName: config.functionName,
      UserName: config.username,
      Password: config.password,
      Parameters: "",
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const xml = await res.text();
  if (!res.ok) throw eryazHttpError(res.status, xml);
  const count = validateEryazXml(xml, minItems);

  const tmpPath = `${outPath}.tmp`;
  await writeFile(tmpPath, xml, "utf8");
  await rename(tmpPath, outPath);
  const { size } = await stat(outPath);
  return { count, bytes: size };
}
