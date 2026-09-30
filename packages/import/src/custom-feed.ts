import { createReadStream, createWriteStream } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { SaxesParser } from "saxes";
import type { FeedProbe, FeedSecret } from "@guntan/db";
import type { XmlFieldKey, XmlFieldMapping } from "@guntan/types";
import type { MappedProduct } from "./index";
import { applyMarginToAmount, applyMarginToPrice, applyPercent } from "./price-tiers";

export type FeedCurrency = "TRY" | "USD" | "EUR";

export type CustomFeedConfig = {
  url: string;
  auth: "none" | "basic" | "header";
  itemTag: string;
  mapping: XmlFieldMapping;
  currency: FeedCurrency | "field";
  currencyField: string;
  vat: "incl" | "excl";
  vatRate: number;
  margin: "tiers" | "fixed" | "none";
  marginPct: number;
  defaultStock: number;
};

export type CustomMappedProduct = MappedProduct & { imageUrl?: string };

export const FEEDS_DIR = process.env.FEEDS_DIR || join(homedir(), "guntan-feeds");

export function customFeedPath(feedId: string) {
  return join(FEEDS_DIR, `${feedId}.xml`);
}

/** xml_feeds.mapping içinde özel kaynak ayarlarını taşıyan anahtarlar "_" ile başlar. */
const FLAG = "_custom";

export const CUSTOM_FIELD_LABELS: { key: XmlFieldKey; label: string; required?: boolean; hint?: string }[] = [
  { key: "sku", label: "Stok kodu", required: true },
  { key: "name", label: "Ürün adı", required: true },
  { key: "price", label: "Fiyat", required: true },
  { key: "externalId", label: "Benzersiz ürün ID", hint: "Boşsa stok kodu kullanılır" },
  { key: "stock", label: "Stok adedi", hint: "Sayı veya Var/Yok" },
  { key: "compareAtPrice", label: "Liste fiyatı (üstü çizili)" },
  { key: "manufacturer", label: "Marka / üretici" },
  { key: "oem", label: "OEM / orijinal parça no" },
  { key: "category", label: "Kategori", hint: "“Ana > Alt” veya “Ana - Alt” desteklenir" },
  { key: "imageUrl", label: "Görsel adresi" },
  { key: "barcode", label: "Barkod" },
  { key: "description", label: "Açıklama" },
  { key: "vehicleBrand", label: "Araç markası" },
  { key: "vehicleModel", label: "Araç modeli" },
];

export function isCustomFeed(mapping: unknown): boolean {
  return Boolean(mapping && typeof mapping === "object" && (mapping as Record<string, string>)[FLAG] === "1");
}

export function feedConfigFromRow(url: string | null, raw: unknown): CustomFeedConfig {
  const m = (raw && typeof raw === "object" ? raw : {}) as Record<string, string>;
  const mapping: XmlFieldMapping = {};
  for (const f of CUSTOM_FIELD_LABELS) if (m[f.key]) mapping[f.key] = m[f.key];
  const num = (v: string | undefined, d: number) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    url: url ?? "",
    auth: m._auth === "basic" || m._auth === "header" ? m._auth : "none",
    itemTag: m._itemTag ?? "",
    mapping,
    currency: m._currency === "USD" || m._currency === "EUR" || m._currency === "field" ? m._currency : "TRY",
    currencyField: m._currencyField ?? "",
    vat: m._vat === "excl" ? "excl" : "incl",
    vatRate: num(m._vatRate, 20),
    margin: m._margin === "fixed" || m._margin === "none" ? m._margin : "tiers",
    marginPct: num(m._marginPct, 0),
    defaultStock: num(m._defaultStock, 0),
  };
}

export function feedRowMapping(cfg: CustomFeedConfig): Record<string, string> {
  const out: Record<string, string> = {
    [FLAG]: "1",
    _auth: cfg.auth,
    _itemTag: cfg.itemTag,
    _currency: cfg.currency,
    _currencyField: cfg.currencyField,
    _vat: cfg.vat,
    _vatRate: String(cfg.vatRate),
    _margin: cfg.margin,
    _marginPct: String(cfg.marginPct),
    _defaultStock: String(cfg.defaultStock),
  };
  for (const [k, v] of Object.entries(cfg.mapping)) if (v) out[k] = v;
  return out;
}

const PRIVATE_HOST = /^(localhost|0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:)/i;

export function assertSafeFeedUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Geçerli bir XML adresi girin (https://...).");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Adres http:// veya https:// ile başlamalı.");
  if (PRIVATE_HOST.test(url.hostname)) throw new Error("Yerel/iç ağ adreslerine bağlanılamaz.");
  return url;
}

export function maskFeedUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const u = new URL(value);
    return `${u.origin}${u.pathname}${u.search ? "?…" : ""}`;
  } catch {
    return value.slice(0, 60);
  }
}

async function openFeed(cfg: CustomFeedConfig, secret: FeedSecret, timeoutMs: number): Promise<Response> {
  assertSafeFeedUrl(cfg.url);
  const headers: Record<string, string> = { Accept: "application/xml, text/xml, */*", "User-Agent": "GuntanFeedBot/1.0" };
  if (cfg.auth === "basic" && secret.username) {
    headers.Authorization = `Basic ${Buffer.from(`${secret.username}:${secret.password}`).toString("base64")}`;
  }
  if (cfg.auth === "header" && secret.headerName && secret.headerValue) headers[secret.headerName] = secret.headerValue;
  const res = await fetch(cfg.url, { headers, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
  if (res.status === 401 || res.status === 403) throw new Error(`Yetkisiz (HTTP ${res.status}) — kullanıcı adı/şifre veya anahtarı kontrol edin.`);
  if (!res.ok || !res.body) throw new Error(`XML indirilemedi (HTTP ${res.status}).`);
  return res;
}

function detectEncoding(head: Uint8Array): string {
  const text = Buffer.from(head.slice(0, 300)).toString("latin1");
  const label = text.match(/encoding=["']([\w-]+)["']/i)?.[1]?.toLowerCase();
  if (!label || label === "utf-8" || label === "utf8") return "utf-8";
  try {
    new TextDecoder(label);
    return label;
  } catch {
    return "utf-8";
  }
}

/** Parça parça gelen baytları doğru karakter kodlamasıyla metne çevirir. */
async function forEachText(source: AsyncIterable<Uint8Array>, onText: (text: string) => boolean | void) {
  let decoder: TextDecoder | null = null;
  for await (const chunk of source) {
    const bytes = chunk instanceof Uint8Array ? chunk : Buffer.from(chunk as string);
    decoder ??= new TextDecoder(detectEncoding(bytes));
    if (onText(decoder.decode(bytes, { stream: true })) === false) return;
  }
  if (decoder) onText(decoder.decode());
}

type Node = { name: string; obj: Record<string, unknown>; text: string; children: number };

/**
 * Genel XML okuyucu: `itemTag` etiketli her öğeyi düz nesne olarak verir.
 * Nitelikler "@ad" anahtarıyla, tekrarlanan alt etiketlerde ilk değer tutulur.
 */
function createParser(opts: {
  itemTag?: string;
  onItem?: (item: Record<string, unknown>) => void;
  onClose?: (name: string, depth: number, keys: number) => void;
}) {
  const parser = new SaxesParser({ xmlns: false });
  const stack: Node[] = [];
  parser.on("opentag", (tag) => {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(tag.attributes)) obj[`@${k}`] = String(v);
    const parent = stack[stack.length - 1];
    if (parent) parent.children += 1;
    stack.push({ name: tag.name, obj, text: "", children: 0 });
  });
  const onText = (t: string) => {
    const top = stack[stack.length - 1];
    if (top) top.text += t;
  };
  parser.on("text", onText);
  parser.on("cdata", onText);
  parser.on("closetag", () => {
    const node = stack.pop();
    if (!node) return;
    const text = node.text.trim();
    const keys = Object.keys(node.obj).length;
    let value: unknown;
    if (node.children > 0 || keys > 0) {
      if (text && node.children === 0) node.obj["#text"] = text;
      value = node.obj;
    } else {
      value = text;
    }
    opts.onClose?.(node.name, stack.length, node.children);
    if (opts.itemTag && node.name === opts.itemTag && typeof value === "object") {
      opts.onItem?.(value as Record<string, unknown>);
      return;
    }
    const parent = stack[stack.length - 1];
    if (parent && !(node.name in parent.obj)) parent.obj[node.name] = value;
  });
  return parser;
}

export function flattenItem(obj: Record<string, unknown>, prefix = "", out: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = k === "#text" ? prefix.replace(/\.$/, "") : `${prefix}${k}`;
    if (v && typeof v === "object") flattenItem(v as Record<string, unknown>, `${key}.`, out);
    else if (key) out[key] = String(v ?? "");
  }
  return out;
}

function fold(s: string) {
  return s
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]/g, "");
}

const GUESS: Partial<Record<XmlFieldKey, { exact: string[]; contains: string[] }>> = {
  externalId: { exact: ["id", "urunid", "productid", "stokid", "itemid", "uid"], contains: ["urunid", "productid"] },
  sku: { exact: ["stokkodu", "stokkod", "urunkodu", "code", "sku", "kod", "productcode", "modelkodu", "itemcode"], contains: ["stokkod", "urunkod", "sku"] },
  name: { exact: ["urunadi", "urunismi", "name", "title", "adi", "ad", "baslik", "productname", "stokadi", "urun"], contains: ["urunad", "productname", "stokad", "name"] },
  price: { exact: ["fiyat", "price", "satisfiyati", "bayifiyati", "netfiyat", "alisfiyati", "fiyat1", "indirimlifiyat"], contains: ["bayifiyat", "netfiyat", "satisfiyat", "fiyat", "price"] },
  compareAtPrice: { exact: ["listefiyati", "listfiyat", "listprice", "piyasafiyati", "psf", "tavsiyefiyat"], contains: ["liste", "piyasa", "listprice", "tavsiye"] },
  stock: { exact: ["stok", "stock", "miktar", "quantity", "qty", "adet", "bakiye", "stokadedi", "stokmiktari", "availability"], contains: ["stok", "stock", "miktar", "quantity"] },
  manufacturer: { exact: ["marka", "brand", "uretici", "manufacturer", "markaadi"], contains: ["marka", "brand", "uretici", "manufacturer"] },
  oem: { exact: ["oem", "oemno", "oemkodu", "oeno", "orjinalno", "originalno", "parcano", "partnumber", "ureticikodu", "manufacturercode"], contains: ["oem", "orjinal", "original", "partnumber", "ureticikod"] },
  category: { exact: ["kategori", "category", "grup", "group", "kategoriadi", "productgroup1"], contains: ["kategori", "category", "grup"] },
  imageUrl: { exact: ["resim", "image", "picture", "foto", "gorsel", "img", "resim1", "image1", "picturepath", "resimurl", "imageurl"], contains: ["resim", "image", "gorsel", "picture", "foto"] },
  barcode: { exact: ["barkod", "barcode", "ean", "gtin"], contains: ["barkod", "barcode", "ean"] },
  description: { exact: ["aciklama", "description", "detay", "urunaciklama"], contains: ["aciklama", "description"] },
};

export function guessMapping(paths: string[]): XmlFieldMapping {
  const used = new Set<string>();
  const out: XmlFieldMapping = {};
  const last = (p: string) => fold(p.split(".").pop() ?? p);
  const order: XmlFieldKey[] = ["externalId", "sku", "name", "compareAtPrice", "price", "stock", "manufacturer", "oem", "category", "imageUrl", "barcode", "description"];
  for (const key of order) {
    const g = GUESS[key];
    if (!g) continue;
    const free = paths.filter((p) => !used.has(p));
    const hit =
      free.find((p) => g.exact.includes(last(p))) ??
      free.find((p) => g.contains.some((c) => last(p).includes(c)));
    if (hit) {
      out[key] = hit;
      used.add(hit);
    }
  }
  return out;
}

export function guessCurrencyField(paths: string[]): string {
  return paths.find((p) => /^(doviz|dovizcinsi|currency|parabirimi|kur|dovizkodu)$/.test(fold(p.split(".").pop() ?? ""))) ?? "";
}

function pickItemTag(stats: Map<string, { count: number; depth: number; objects: number }>): string {
  let best: { name: string; count: number; depth: number } | null = null;
  for (const [name, s] of stats) {
    if (s.count < 2 || s.objects < s.count * 0.8) continue;
    if (!best || s.depth < best.depth || (s.depth === best.depth && s.count > best.count)) best = { name, ...s };
  }
  return best?.name ?? "";
}

/** Kaynağa bağlanır, ilk ~4 MB'tan ürün etiketini ve alanları çıkarır. */
export async function probeFeed(cfg: CustomFeedConfig, secret: FeedSecret): Promise<FeedProbe> {
  const probedAt = new Date().toISOString();
  try {
    const res = await openFeed(cfg, secret, 60_000);
    const LIMIT = 4_000_000;
    let text = "";
    let bytes = 0;
    const source = Readable.fromWeb(res.body as never) as AsyncIterable<Uint8Array>;
    await forEachText(
      (async function* () {
        for await (const chunk of source) {
          bytes += chunk.length;
          yield chunk;
          if (bytes >= LIMIT) break;
        }
      })(),
      (t) => {
        text += t;
      },
    );
    if (!/<[A-Za-z]/.test(text.slice(0, 2000))) throw new Error("Yanıt XML değil. Adresi tarayıcıda açıp XML döndüğünü kontrol edin.");

    let itemTag = cfg.itemTag.trim();
    if (!itemTag) {
      const stats = new Map<string, { count: number; depth: number; objects: number }>();
      const p = createParser({
        onClose: (name, depth, children) => {
          const s = stats.get(name) ?? { count: 0, depth, objects: 0 };
          s.count += 1;
          s.depth = Math.min(s.depth, depth);
          if (children >= 2) s.objects += 1;
          stats.set(name, s);
        },
      });
      try {
        p.write(text);
      } catch {
        /* dosya kesildiği için sondaki hata beklenir */
      }
      itemTag = pickItemTag(stats);
      if (!itemTag) throw new Error("Ürün listesi algılanamadı. “Ürün etiketi” alanına XML’deki ürün etiketini (ör. urun, product, item) yazın.");
    }

    const items: Record<string, string>[] = [];
    const p = createParser({ itemTag, onItem: (item) => void (items.length < 300 && items.push(flattenItem(item))) });
    try {
      p.write(text);
    } catch {
      /* dosya kesildiği için sondaki hata beklenir */
    }
    if (!items.length) throw new Error(`“${itemTag}” etiketinde ürün bulunamadı.`);

    const fieldMap = new Map<string, string[]>();
    for (const item of items) {
      for (const [k, v] of Object.entries(item)) {
        const list = fieldMap.get(k) ?? [];
        if (v && list.length < 3 && !list.includes(v)) list.push(v.slice(0, 120));
        fieldMap.set(k, list);
      }
    }
    return {
      probedAt,
      ok: true,
      itemTag,
      itemCount: items.length,
      bytes,
      fields: [...fieldMap.entries()].map(([path, samples]) => ({ path, samples })),
      items: items.slice(0, 8).map((i) => Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v.slice(0, 300)]))),
    };
  } catch (err) {
    const msg = err instanceof Error ? (err.name === "TimeoutError" ? "Bağlantı zaman aşımına uğradı (60 sn)." : err.message) : String(err);
    return { probedAt, ok: false, error: msg };
  }
}

/** XML'i geçici dosyaya indirir; en az bir ürün içeriyorsa asıl dosyanın yerine koyar. */
export async function downloadFeed(cfg: CustomFeedConfig, secret: FeedSecret, outPath: string) {
  const res = await openFeed(cfg, secret, 15 * 60_000);
  const tmp = `${outPath}.tmp`;
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp));
  const count = (await parseFeedFile(tmp, cfg.itemTag)).length;
  if (!count) {
    await rm(tmp, { force: true });
    throw new Error(`İndirilen dosyada “${cfg.itemTag}” etiketinde ürün yok; mevcut dosya korunuyor.`);
  }
  await rename(tmp, outPath);
  return { count, bytes: (await stat(outPath)).size };
}

export async function parseFeedFile(path: string, itemTag: string): Promise<Record<string, string>[]> {
  const items: Record<string, string>[] = [];
  const parser = createParser({ itemTag, onItem: (item) => void items.push(flattenItem(item)) });
  await forEachText(createReadStream(path), (t) => void parser.write(t));
  parser.close();
  return items;
}

export function parseNumber(value: string | undefined): number {
  if (!value) return Number.NaN;
  let s = value.replace(/[^\d.,-]/g, "");
  if (!s) return Number.NaN;
  const comma = s.lastIndexOf(",");
  const dot = s.lastIndexOf(".");
  if (comma > -1 && dot > -1) {
    s = comma > dot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (comma > -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  return Number(s);
}

const IN_STOCK = new Set(["VAR", "EVET", "TRUE", "STOKTA", "MEVCUT", "YES", "INSTOCK", "IN STOCK", "STOKTAVAR", "AVAILABLE"]);

export function parseStock(value: string | undefined): number {
  if (value === undefined) return 0;
  const folded = value.trim().toLocaleUpperCase("tr-TR");
  if (!folded) return 0;
  if (IN_STOCK.has(folded) || IN_STOCK.has(folded.replace(/\s+/g, ""))) return 4;
  const n = parseNumber(folded.replace(/[<>+]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function normalizeCurrency(value: string | undefined): FeedCurrency {
  const v = fold(value ?? "");
  if (/^(usd|dolar|\$)/.test(v) || value?.includes("$")) return "USD";
  if (/^(eur|euro|avro)/.test(v) || value?.includes("€")) return "EUR";
  return "TRY";
}

/** Kaynak satırını ürüne çevirir; fiyat TL'ye, KDV dahile ve kâr marjına göre hesaplanır. */
export function mapCustomItem(item: Record<string, string>, cfg: CustomFeedConfig, fx: { EUR: number; USD: number }): CustomMappedProduct | null {
  const get = (key: XmlFieldKey) => {
    const path = cfg.mapping[key];
    const v = path ? item[path] : undefined;
    return v?.trim() || undefined;
  };
  const sku = get("sku") ?? get("externalId");
  const externalId = get("externalId") ?? sku;
  const name = get("name");
  const cost = parseNumber(get("price"));
  if (!externalId || !sku || !name || !Number.isFinite(cost) || cost <= 0) return null;

  const currency = cfg.currency === "field" ? normalizeCurrency(cfg.currencyField ? item[cfg.currencyField] : undefined) : cfg.currency;
  const rate = currency === "TRY" ? 1 : fx[currency];
  const vatFactor = cfg.vat === "excl" ? 1 + cfg.vatRate / 100 : 1;
  const toTry = (n: number) => n * rate * vatFactor;
  const costTry = toTry(cost);
  const margin = (amount: number) =>
    cfg.margin === "tiers" ? applyMarginToAmount(costTry, amount) : cfg.margin === "fixed" ? applyPercent(amount, cfg.marginPct) : Math.round(amount * 100) / 100;
  const sale = cfg.margin === "tiers" ? applyMarginToPrice(costTry) : margin(costTry);
  const list = parseNumber(get("compareAtPrice"));
  const listSale = Number.isFinite(list) && list > 0 ? margin(toTry(list)) : 0;
  const image = get("imageUrl");

  return {
    externalId: externalId.slice(0, 191),
    sku: sku.slice(0, 191),
    name: name.slice(0, 512),
    description: get("description"),
    manufacturer: get("manufacturer")?.slice(0, 191),
    category: get("category"),
    price: sale.toFixed(2),
    compareAtPrice: listSale > sale ? listSale.toFixed(2) : undefined,
    stock: cfg.mapping.stock ? parseStock(get("stock")) : cfg.defaultStock,
    barcode: get("barcode")?.slice(0, 64),
    oem: get("oem"),
    imageUrl: image && /^https?:\/\//i.test(image) ? image : undefined,
    vehicleBrand: get("vehicleBrand"),
    vehicleModel: get("vehicleModel"),
  };
}
