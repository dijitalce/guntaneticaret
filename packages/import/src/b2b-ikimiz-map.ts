import { normalizeOem, type MappedProduct } from "./index";
import { addVat, applyMarginToPrice, vatRateFromEnv } from "./price-tiers";
import { fxRatesFromEnv, priceToTry } from "./basbug-map";

/** İkimiz Oto B2B getProductListService satırı (örnek yanıttan; "Depo-1" ve "Depo_1" aynı bilgiyi iki yazımla verir). */
export type B2bIkimizRaw = {
  Code?: string;
  Name?: string;
  Manufacturer?: string;
  Oem_No?: string | null;
  SpecialField_1?: string | null;
  Unit?: string | null;
  /** Bayiye özel net satış fiyatı, KDV hariç. */
  SalePriceContact?: number | string | null;
  SalePriceContactCurrency?: string | null;
  /** Aynı fiyat, KDV dahil. */
  SalePriceContactTax?: number | string | null;
  SalePriceContactTaxCurrency?: string | null;
  "Depo-1"?: string | null;
  "Depo-2"?: string | null;
  Depo_1?: string | null;
  Depo_2?: string | null;
};

export const B2B_IKIMIZ_SUPPLIER_CODE = "IKIMIZ";

/** Yalnızca KDV hariç fiyat gelirse eklenecek oran (varsayılan 20). */
export function b2bIkimizVatRate(): number {
  return vatRateFromEnv("B2B_IKIMIZ_VAT_RATE");
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

/** Depo bilgisi "Var"/"Yok" gelir (adet yok). Herhangi bir depoda "Var" ise stokta sayılır. */
export function b2bIkimizInStock(row: B2bIkimizRaw): boolean {
  return [row["Depo-1"], row["Depo-2"], row.Depo_1, row.Depo_2].some((v) => (v ?? "").trim().toLocaleUpperCase("tr-TR") === "VAR");
}

/** "Var" için gösterilen adet (varsayılan 4, Başbuğ/Oto İsmail ile aynı). B2B_IKIMIZ_STOCK ile değişir. */
export function b2bIkimizStockQty(): number {
  const n = Math.floor(Number(process.env.B2B_IKIMIZ_STOCK || 4));
  return Number.isFinite(n) && n > 0 ? n : 4;
}

/**
 * Maliyet, KDV dahil TL. API KDV dahil fiyatı (SalePriceContactTax) hazır verir; yoksa KDV hariç fiyata oran eklenir.
 * Marj bu KDV dahil maliyete uygulanır (diğer tedarikçilerle aynı kural).
 */
export function b2bIkimizCostTry(row: B2bIkimizRaw, rates = fxRatesFromEnv(), vatRate = b2bIkimizVatRate()): number | null {
  const gross = num(row.SalePriceContactTax);
  if (gross > 0) return priceToTry(gross, currencyCode(row.SalePriceContactTaxCurrency ?? row.SalePriceContactCurrency), rates);
  const net = num(row.SalePriceContact);
  if (net > 0) return addVat(priceToTry(net, currencyCode(row.SalePriceContactCurrency), rates), vatRate);
  return null;
}

/** "VP DCDK-01-100" → "DCDK-01-100" (marka kısaltması öneki atılır). */
export function b2bIkimizPartNumber(row: B2bIkimizRaw): string {
  const code = (row.Code ?? "").trim();
  const i = code.indexOf(" ");
  return i > 0 ? code.slice(i + 1).trim() : code;
}

/** Eşleştirme ve dedupe anahtarı olacak numaralar: OEM listesi ("|" ile ayrılı) + özel alan + üretici parça no. */
export function b2bIkimizNumbers(row: B2bIkimizRaw): Array<{ raw: string; normalized: string }> {
  const seen = new Set<string>();
  const list: Array<{ raw: string; normalized: string }> = [];
  const parts = [...(row.Oem_No ?? "").split(/[|;,/\s]+/), ...(row.SpecialField_1 ?? "").split(/[|;,/\s]+/), b2bIkimizPartNumber(row)];
  for (const part of parts) {
    const raw = part.trim();
    const normalized = normalizeOem(raw);
    if (normalized.length < 5 || seen.has(normalized)) continue;
    seen.add(normalized);
    list.push({ raw: raw.slice(0, 191), normalized: normalized.slice(0, 191) });
  }
  return list.slice(0, 20);
}

export function mapB2bIkimizRow(row: B2bIkimizRaw, rates = fxRatesFromEnv(), vatRate = b2bIkimizVatRate()): MappedProduct | null {
  const code = row.Code?.trim();
  if (!code) return null;
  const costTry = b2bIkimizCostTry(row, rates, vatRate);
  if (costTry == null) return null;
  return {
    externalId: code.slice(0, 191),
    sku: code.slice(0, 191),
    name: (row.Name?.trim() || code).slice(0, 512),
    manufacturer: row.Manufacturer?.trim().slice(0, 191) || undefined,
    price: applyMarginToPrice(costTry).toFixed(2),
    stock: b2bIkimizInStock(row) ? b2bIkimizStockQty() : 0,
    oem: b2bIkimizNumbers(row)[0]?.raw,
  };
}
