import { normalizeOem, type MappedProduct } from "./index";
import { inferFitments, type InferredFitment } from "./fitment-from-name";
import { applyMarginToPrice } from "./price-tiers";

export type BasbugRaw = {
  no?: string;
  ac?: string;
  ac2?: string;
  oe?: string;
  uk?: string;
  lgk?: string;
  m?: string;
  mo?: string;
  y?: string;
  dc?: string;
  lf?: number | string;
  _listeGrubu?: string;
  _listeGrubuAd?: string;
};

const GROUP_BRAND: Record<string, string> = {
  BMW: "BMW",
  FIAT: "Fiat",
  FORD: "Ford",
  MERCEDES: "Mercedes",
  OPEL: "Opel",
  RENAULT: "Renault",
  VOLVO: "Volvo",
  VW: "Volkswagen",
  EV: "Tesla",
};

const FX_DEFAULTS = { EUR: 56.3, USD: 48.4 };

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function fxRatesFromEnv(): { EUR: number; USD: number } {
  return {
    EUR: Number(process.env.BASBUG_EUR_TRY || FX_DEFAULTS.EUR),
    USD: Number(process.env.BASBUG_USD_TRY || FX_DEFAULTS.USD),
  };
}

export function priceToTry(amount: number, currency: string | undefined, rates = fxRatesFromEnv()): number {
  const cur = (currency || "TL").toUpperCase();
  if (cur === "TL" || cur === "TRY") return amount;
  if (cur === "EUR") return amount * rates.EUR;
  if (cur === "USD") return amount * rates.USD;
  return amount;
}

export function splitOems(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[/|;,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => normalizeOem(s).length >= 5);
}

function buildName(row: BasbugRaw): string {
  const parts = [row.ac?.trim(), row.ac2?.trim()].filter(Boolean);
  return parts.join(" — ") || row.no || "Ürün";
}

export function mapBasbugRow(row: BasbugRaw, rates = fxRatesFromEnv()): MappedProduct | null {
  const externalId = row.no?.trim();
  if (!externalId) return null;
  const lf = Number(row.lf);
  if (!Number.isFinite(lf) || lf < 0) return null;
  const priceTry = priceToTry(lf, row.dc, rates);
  const sellTry = applyMarginToPrice(priceTry);
  const oems = splitOems(row.oe);
  const category = row._listeGrubuAd?.trim() || row.lgk?.trim() || undefined;
  return {
    externalId,
    sku: externalId,
    name: buildName(row),
    description: [row.m, row.mo, row.y].filter(Boolean).join(" | ") || undefined,
    manufacturer: row.uk?.trim() || undefined,
    category,
    price: sellTry.toFixed(2),
    stock: 4,
    oem: oems[0],
  };
}

function splitModelTokens(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,/|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !/^(BM|B\.M|B\.M\.)$/i.test(s));
}

export function inferBasbugFitments(row: BasbugRaw, limit = 8): InferredFitment[] {
  const group = (row._listeGrubu || row.lgk || "").toUpperCase();
  const groupBrand = GROUP_BRAND[group];
  const haystack = [groupBrand, row._listeGrubuAd, row.m, row.ac].filter(Boolean).join(" ");
  const inferred = inferFitments(haystack, limit);
  if (inferred.length > 0) return inferred;

  if (!groupBrand) return [];
  const models = splitModelTokens(row.m).slice(0, limit);
  if (models.length === 0) return [{ brand: groupBrand, model: "Diger" }];
  return models.map((model) => ({ brand: groupBrand, model }));
}

export function allOemsForRow(row: BasbugRaw): Array<{ raw: string; normalized: string }> {
  return splitOems(row.oe).map((raw) => ({ raw, normalized: normalizeOem(raw) }));
}
