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

/** Liste fiyatından (Fiyat1) düşülen bayi iskontosu, % (OTOISMAIL_DISCOUNT_PERCENT; varsayılan 0). */
export function otoIsmailDiscountPercent(): number {
  const n = Number(process.env.OTOISMAIL_DISCOUNT_PERCENT || 0);
  return Number.isFinite(n) && n > 0 && n < 100 ? n : 0;
}

/** Marka bazlı iskonto: OTOISMAIL_BRAND_DISCOUNTS="GVA:55.8,TOTAL:59.5" (genel orandan önceliklidir). */
export function otoIsmailBrandDiscounts(raw = process.env.OTOISMAIL_BRAND_DISCOUNTS): Map<string, number> {
  const map = new Map<string, number>();
  for (const part of (raw ?? "").split(",")) {
    const [brand, pct] = part.split(":").map((s) => s.trim());
    const n = Number(pct);
    if (brand && Number.isFinite(n) && n >= 0 && n < 100) map.set(brand.toUpperCase(), n);
  }
  return map;
}

/**
 * Maliyet = liste fiyatı (Fiyat1) eksi bayi iskontosu; kampanya fiyatı (Fiyat3) daha düşükse o.
 * B2B'deki "Net fiyat" API'de gelmediği için iskonto ayardan verilir. Tutar KDV hariç, para birimi sembolüyle.
 */
export function otoIsmailCost(
  row: OtoIsmailRaw,
  discountPercent?: number,
): { amount: number; currency: string } | null {
  const pct = discountPercent ?? otoIsmailBrandDiscounts().get((otoIsmailBrand(row) ?? "").toUpperCase()) ?? otoIsmailDiscountPercent();
  const candidates: Array<{ amount: number; currency: string }> = [];
  const list = num(row.Fiyat1?.Deger);
  if (list > 0) candidates.push({ amount: list * (1 - pct / 100), currency: currencyCode(row.Fiyat1?.ParaBirimi) });
  const campaign = num(row.Fiyat3?.Deger);
  if (campaign > 0) candidates.push({ amount: campaign, currency: currencyCode(row.Fiyat3?.ParaBirimi) });
  if (!candidates.length) return null;
  return candidates.reduce((best, c) => (c.amount < best.amount ? c : best));
}

export function otoIsmailStock(row: OtoIsmailRaw): number {
  if (row.StokSayisi != null && row.StokSayisi !== "") return Math.max(0, Math.floor(num(row.StokSayisi)));
  return Math.max(0, Math.floor(num(row.Plaza) + num(row.Gebze)));
}

/**
 * Tedarikçide stoğu 0 olan ürünler de stokta gösterilir (varsayılan 4 adet, Başbuğ ile aynı).
 * Kapatmak için OTOISMAIL_ASSUME_IN_STOCK=0; adet için OTOISMAIL_ASSUMED_STOCK.
 */
export function otoIsmailAssumedStock(): number {
  if (process.env.OTOISMAIL_ASSUME_IN_STOCK === "0") return 0;
  const n = Math.floor(Number(process.env.OTOISMAIL_ASSUMED_STOCK || 4));
  return Number.isFinite(n) && n > 0 ? n : 4;
}

/**
 * Gerçek marka: stok kodunun marka öneki ("GVA 3511003" → "GVA"). MarkaFull çoğu satırda
 * "GVA SİLİNDİR KAPAKLARI" gibi marka + ürün grubu geldiği için marka olarak kullanılmaz.
 */
export function otoIsmailBrand(row: OtoIsmailRaw): string | undefined {
  const kod = (row.Kod ?? "").trim();
  const i = kod.indexOf(" ");
  const prefix = i > 0 ? kod.slice(0, i).trim() : "";
  return prefix || (row.Marka ?? "").trim() || (row.MarkaFull ?? "").trim() || undefined;
}

/** "GVA SİLİNDİR KAPAKLARI" → "SİLİNDİR KAPAKLARI" (marka öneki atılmış ürün grubu). */
export function otoIsmailCategory(row: OtoIsmailRaw): string | undefined {
  const brand = otoIsmailBrand(row);
  let name = (row.MarkaFull ?? "").trim();
  if (!name) return undefined;
  for (const prefix of [row.Marka, brand]) {
    const p = (prefix ?? "").trim();
    if (p && name.toUpperCase().startsWith(`${p.toUpperCase()} `)) {
      name = name.slice(p.length + 1).trim();
      break;
    }
  }
  if (!name || (brand && name.toUpperCase() === brand.toUpperCase())) return undefined;
  return name;
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
    category: otoIsmailCategory(row),
    price: sellTry.toFixed(2),
    stock: otoIsmailStock(row) || otoIsmailAssumedStock(),
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
  const brands = [...new Set([otoIsmailBrand(row), row.Marka?.trim()].map((b) => brandKey(b)).filter(Boolean))];
  const numbers = otoIsmailNumbers(row);
  return brands.flatMap((brand) => numbers.map((n) => `${brand}::${n.normalized}`));
}
