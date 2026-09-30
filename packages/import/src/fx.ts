import { fxRatesFromEnv } from "./basbug-map";

export type FxRates = { EUR: number; USD: number };

const TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";

function forexSelling(xml: string, code: string): number | null {
  const block = xml.match(new RegExp(`<Currency[^>]*CurrencyCode="${code}"[^>]*>([\\s\\S]*?)</Currency>`));
  if (!block) return null;
  const unit = Number(block[1]!.match(/<Unit>([\d.]+)<\/Unit>/)?.[1] ?? 1);
  const selling = Number(block[1]!.match(/<ForexSelling>([\d.]+)<\/ForexSelling>/)?.[1]);
  if (!Number.isFinite(selling) || selling <= 0 || !Number.isFinite(unit) || unit <= 0) return null;
  return selling / unit;
}

export function parseTcmbRates(xml: string): FxRates | null {
  const EUR = forexSelling(xml, "EUR");
  const USD = forexSelling(xml, "USD");
  if (EUR == null || USD == null) return null;
  return { EUR, USD };
}

export async function fetchTcmbRates(timeoutMs = 15_000): Promise<FxRates> {
  const res = await fetch(TCMB_URL, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`TCMB HTTP ${res.status}`);
  const rates = parseTcmbRates(await res.text());
  if (!rates) throw new Error("TCMB yanıtında EUR/USD bulunamadı");
  return rates;
}

/**
 * BASBUG_EUR_TRY / BASBUG_USD_TRY elle verildiyse onlar kullanılır.
 * Yoksa TCMB döviz satış kuru; TCMB'ye ulaşılamazsa varsayılan sabit kur.
 */
export async function resolveFxRates(): Promise<FxRates & { source: string }> {
  if (process.env.BASBUG_EUR_TRY || process.env.BASBUG_USD_TRY) {
    return { ...fxRatesFromEnv(), source: "env" };
  }
  try {
    return { ...(await fetchTcmbRates()), source: "tcmb" };
  } catch (err) {
    console.warn("TCMB kuru alınamadı, sabit kur kullanılıyor:", err instanceof Error ? err.message : err);
    return { ...fxRatesFromEnv(), source: "default" };
  }
}
