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

/**
 * Eryaz GetProduct → XML dosyası. Önce geçici dosyaya yazar, doğrulanırsa
 * yerine taşır; hatalı/boş yanıt mevcut products.xml'i ezmez.
 */
export async function fetchEryazXml(
  config: EryazConfig,
  outPath: string,
  { minItems = 1000, timeoutMs = 300_000 } = {},
): Promise<{ count: number; bytes: number }> {
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
  if (!res.ok) throw new Error(`Eryaz HTTP ${res.status}: ${xml.slice(0, 300)}`);
  const count = validateEryazXml(xml, minItems);

  const tmpPath = `${outPath}.tmp`;
  await writeFile(tmpPath, xml, "utf8");
  await rename(tmpPath, outPath);
  const { size } = await stat(outPath);
  return { count, bytes: size };
}
