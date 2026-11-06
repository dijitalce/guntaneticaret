import { normalizeOem, type MappedProduct } from "./index";
import { addVat, applyMarginToPrice, vatRateFromEnv } from "./price-tiers";
import { priceToTry, slugify, fxRatesFromEnv } from "./basbug-map";

type Money = { ParaBirimi?: string | null; Deger?: number | string | null };

/** Oto İsmail GetProducts satırı (JSON). */
export type OtoIsmailRaw = {
  NetsisStokId?: number | string;
  Kod?: string;
  OrjinalKod?: string;
  Ad?: string;
  Marka?: string;
  MarkaFull?: string;
  Birim?: string;
  GrupKodu?: string;
  Barkod1?: string;
  ImageUrl?: string | null;
  Fiyat1?: Money | null;
  Fiyat2?: Money | null;
  Fiyat3?: Money | null;
  Fiyat4?: Money | null;
  KDV?: number;
  Oem?: string | null;
  Pay?: number;
  Payda?: number;
  StokSayisi?: number | string | null;
  Plaza?: number | string | null;
  Gebze?: number | string | null;
};

export const OTOISMAIL_SUPPLIER_CODE = "OTOISMAIL";

export function otoIsmailVatRate(): number {
  return vatRateFromEnv("OTOISMAIL_VAT_RATE");
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function currencyCode(symbol: string | null | undefined): string {
  const s = (symbol ?? "").trim().toUpperCase();
  if (s === "$" || s === "USD" || s === "DOLAR") return "USD";
  if (s === "€" || s === "EUR" || s === "EURO") return "EUR";
  return "TL";
}

/** Fiyat3 (kampanyalı) doluysa o, yoksa Fiyat1 (liste). Dönen tutar KDV hariç, para birimi sembolüyle. */
export function otoIsmailCost(row: OtoIsmailRaw): { amount: number; currency: string } | null {
  for (const price of [row.Fiyat3, row.Fiyat1]) {
    const amount = num(price?.Deger);
    if (amount > 0) return { amount, currency: currencyCode(price?.ParaBirimi) };
  }
  return null;
}

export function otoIsmailStock(row: OtoIsmailRaw): number {
  if (row.StokSayisi != null && row.StokSayisi !== "") return Math.max(0, Math.floor(num(row.StokSayisi)));
  return Math.max(0, Math.floor(num(row.Plaza) + num(row.Gebze)));
}

export function otoIsmailBrand(row: OtoIsmailRaw): string | undefined {
  return (row.MarkaFull || row.Marka || "").trim() || undefined;
}

/** "GVA 3443210" → "3443210" (marka öneki atılır). */
export function otoIsmailPartNumber(row: OtoIsmailRaw): string {
  const kod = (row.Kod ?? "").trim();
  const brand = (row.Marka ?? "").trim();
  if (brand && kod.toUpperCase().startsWith(`${brand.toUpperCase()} `)) return kod.slice(brand.length + 1).trim();
  const i = kod.indexOf(" ");
  return i > 0 ? kod.slice(i + 1).trim() : kod;
}

/**
 * Oem alanı "6455.W7-6455.Y0-6455.X9" gibi tire ile ayrılabiliyor; ama tek bir numara da tire içerebilir ("1K0-615-301").
 * Tireyle bölme yalnızca her parça en az 5 karakterse yapılır.
 */
export function splitOtoIsmailOems(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const out: string[] = [];
  for (const chunk of raw.split(/[/|;,\s]+/)) {
    const c = chunk.trim();
    if (!c) continue;
    const parts = c.split("-").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every((p) => normalizeOem(p).length >= 5)) out.push(...parts);
    else out.push(c);
  }
  return out.filter((s) => normalizeOem(s).length >= 5);
}

/** Eşleştirme ve dedupe anahtarı olacak tüm numaralar: Oem listesi + üretici parça no + orijinal kod. */
export function otoIsmailNumbers(row: OtoIsmailRaw): Array<{ raw: string; normalized: string }> {
  const seen = new Set<string>();
  const list: Array<{ raw: string; normalized: string }> = [];
  for (const raw of [...splitOtoIsmailOems(row.Oem), otoIsmailPartNumber(row), (row.OrjinalKod ?? "").trim()]) {
    const normalized = normalizeOem(raw);
    if (normalized.length < 5 || seen.has(normalized)) continue;
    seen.add(normalized);
    list.push({ raw: raw.slice(0, 191), normalized: normalized.slice(0, 191) });
  }
  return list;
}

export function otoIsmailExternalId(row: OtoIsmailRaw): string | null {
  const id = row.NetsisStokId != null && row.NetsisStokId !== "" ? String(row.NetsisStokId) : (row.Kod ?? "").trim();
  return id || null;
}

export function mapOtoIsmailRow(
  row: OtoIsmailRaw,
  rates = fxRatesFromEnv(),
  vatRate = otoIsmailVatRate(),
): MappedProduct | null {
  const externalId = otoIsmailExternalId(row);
  const sku = row.Kod?.trim();
  if (!externalId || !sku) return null;
  const cost = otoIsmailCost(row);
  if (!cost) return null;
  const costTry = addVat(priceToTry(cost.amount, cost.currency, rates), vatRate);
  const sellTry = applyMarginToPrice(costTry);
  return {
    externalId,
    sku,
    name: row.Ad?.trim() || sku,
    manufacturer: otoIsmailBrand(row),
    price: sellTry.toFixed(2),
    stock: otoIsmailStock(row),
    oem: otoIsmailNumbers(row)[0]?.raw,
    barcode: row.Barkod1?.trim() || undefined,
  };
}

/** Görsel adresindeki boşlukları kodlar ("GVA 3443210.jpg"); http dışı/boş adresler elenir. */
export function otoIsmailImageUrl(row: OtoIsmailRaw): string | null {
  const url = row.ImageUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

export function brandKey(name: string | undefined): string {
  return name ? slugify(name) : "";
}

/** Görsel eşleme anahtarı: marka slug + normalize numara. */
export function imageMatchKeys(row: OtoIsmailRaw): string[] {
  const brand = brandKey(otoIsmailBrand(row));
  if (!brand) return [];
  return otoIsmailNumbers(row).map((n) => `${brand}::${n.normalized}`);
}
