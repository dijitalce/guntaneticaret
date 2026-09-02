import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { SaxesParser } from "saxes";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  categories,
  compileVisibility,
  db,
  manufacturers,
  productCategories,
  productFitments,
  productOems,
  products,
  vehicleBrands,
  vehicleEngines,
  vehicleGenerations,
  vehicleModels,
  xmlImportRowErrors,
  xmlImportRuns,
  xmlFeeds,
} from "@guntan/db";
import { IMPORT_RUN_STATUS, PRODUCT_SOURCE, PRODUCT_STATUS, XML_BATCH_SIZE, type XmlFieldMapping } from "@guntan/types";

export type MappedProduct = {
  externalId: string;
  sku: string;
  name: string;
  description?: string;
  manufacturer?: string;
  category?: string;
  price: string;
  compareAtPrice?: string;
  stock: number;
  barcode?: string;
  oem?: string;
  imageUrl?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleGeneration?: string;
  vehicleEngine?: string;
};

function slugify(value: string): string {
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

export function contentHash(row: MappedProduct): string {
  return createHash("sha256").update(JSON.stringify(row)).digest("hex");
}

export function normalizeOem(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function getPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  if (cur == null) return undefined;
  return String(cur);
}

function stockValue(raw: string | undefined) {
  if (!raw) return 0;
  const folded = raw.trim().toLocaleUpperCase("tr-TR");
  if (folded === "VAR") return 4;
  if (folded === "YOK") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function mapRaw(raw: Record<string, unknown>, mapping: XmlFieldMapping): MappedProduct | null {
  const externalId = mapping.externalId ? getPath(raw, mapping.externalId) : undefined;
  const sku = mapping.sku ? getPath(raw, mapping.sku) : undefined;
  const name = mapping.name ? getPath(raw, mapping.name) : undefined;
  const price = mapping.price ? getPath(raw, mapping.price) : undefined;
  if (!externalId || !sku || !name || !price) return null;
  return {
    externalId,
    sku,
    name,
    description: mapping.description ? getPath(raw, mapping.description) : undefined,
    manufacturer: mapping.manufacturer ? getPath(raw, mapping.manufacturer) : undefined,
    category: mapping.category ? getPath(raw, mapping.category) : undefined,
    price,
    compareAtPrice: mapping.compareAtPrice ? getPath(raw, mapping.compareAtPrice) : undefined,
    stock: Number(stockValue(mapping.stock ? getPath(raw, mapping.stock) : undefined)),
    barcode: mapping.barcode ? getPath(raw, mapping.barcode) : undefined,
    oem: mapping.oem ? getPath(raw, mapping.oem) : undefined,
    imageUrl: mapping.imageUrl ? getPath(raw, mapping.imageUrl) : undefined,
    vehicleBrand: mapping.vehicleBrand ? getPath(raw, mapping.vehicleBrand) : undefined,
    vehicleModel: mapping.vehicleModel ? getPath(raw, mapping.vehicleModel) : undefined,
    vehicleGeneration: mapping.vehicleGeneration ? getPath(raw, mapping.vehicleGeneration) : undefined,
    vehicleEngine: mapping.vehicleEngine ? getPath(raw, mapping.vehicleEngine) : undefined,
  };
}

export async function parseProductXml(stream: Readable): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const parser = new SaxesParser({ xmlns: false, additionalNamespaces: {} });
    const products: Record<string, unknown>[] = [];
    const stack: { name: string; obj: Record<string, unknown>; text: string }[] = [];

    parser.on("error", reject);
    parser.on("opentag", (tag) => {
      stack.push({ name: tag.name, obj: {}, text: "" });
    });
    parser.on("text", (text) => {
      const top = stack[stack.length - 1];
      if (top) top.text += text;
    });
    parser.on("closetag", (tag) => {
      const node = stack.pop();
      if (!node) return;
      const parent = stack[stack.length - 1];
      const value = Object.keys(node.obj).length > 0 ? node.obj : node.text.trim();
      if (tag.name === "product" || tag.name === "Item") {
        products.push(typeof value === "object" ? (value as Record<string, unknown>) : { value });
        return;
      }
      if (parent) {
        parent.obj[tag.name] = value;
      }
    });
    parser.on("end", () => resolve(products));

    stream.on("data", (chunk) => parser.write(String(chunk)));
    stream.on("end", () => parser.close());
    stream.on("error", reject);
  });
}

async function upsertBrand(name: string) {
  const slug = slugify(name);
  const [existing] = await db.select().from(vehicleBrands).where(eq(vehicleBrands.slug, slug)).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(vehicleBrands).values({ name, slug }).returning();
  return row!;
}

async function upsertModel(brandId: string, name: string) {
  const slug = slugify(name);
  const [existing] = await db
    .select()
    .from(vehicleModels)
    .where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.slug, slug)))
    .limit(1);
  if (existing) return existing;
  const [row] = await db.insert(vehicleModels).values({ brandId, name, slug }).returning();
  return row!;
}

async function upsertGeneration(modelId: string, name: string) {
  const slug = slugify(name);
  const [existing] = await db
    .select()
    .from(vehicleGenerations)
    .where(and(eq(vehicleGenerations.modelId, modelId), eq(vehicleGenerations.slug, slug)))
    .limit(1);
  if (existing) return existing;
  const [row] = await db.insert(vehicleGenerations).values({ modelId, name, slug }).returning();
  return row!;
}

async function upsertEngine(generationId: string, name: string) {
  const slug = slugify(name);
  const [existing] = await db
    .select()
    .from(vehicleEngines)
    .where(and(eq(vehicleEngines.generationId, generationId), eq(vehicleEngines.slug, slug)))
    .limit(1);
  if (existing) return existing;
  const [row] = await db.insert(vehicleEngines).values({ generationId, name, slug }).returning();
  return row!;
}

async function upsertManufacturer(name: string) {
  const slug = slugify(name);
  const [existing] = await db.select().from(manufacturers).where(eq(manufacturers.slug, slug)).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(manufacturers).values({ name, slug }).returning();
  return row!;
}

async function upsertCategory(name: string) {
  const slug = slugify(name);
  const [existing] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(categories).values({ name, slug, path: slug }).returning();
  return row!;
}

type ImportStats = {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  inactivated: number;
  total: number;
};

async function processBatch(supplierId: string, batch: MappedProduct[], stats: ImportStats, runId: string) {
  for (const row of batch) {
    try {
      const hash = contentHash(row);
      const [existing] = await db
        .select()
        .from(products)
        .where(and(eq(products.supplierId, supplierId), eq(products.externalId, row.externalId)))
        .limit(1);

      let manufacturerId: string | null = null;
      if (row.manufacturer) manufacturerId = (await upsertManufacturer(row.manufacturer)).id;

      if (existing && existing.contentHash === hash) {
        stats.unchanged += 1;
        continue;
      }

      const payload = {
        supplierId,
        manufacturerId,
        sku: row.sku,
        externalId: row.externalId,
        name: row.name,
        slug: slugify(`${row.name}-${row.sku}`),
        description: row.description ?? null,
        barcode: row.barcode ?? null,
        price: row.price,
        compareAtPrice: row.compareAtPrice ?? null,
        stockQty: row.stock,
        stockStatus: row.stock > 0 ? "in_stock" : "out_of_stock",
        status: PRODUCT_STATUS.ACTIVE,
        contentHash: hash,
        source: PRODUCT_SOURCE.XML,
      };

      let productId: string;
      if (existing) {
        await db.update(products).set(payload).where(eq(products.id, existing.id));
        productId = existing.id;
        stats.updated += 1;
      } else {
        const [created] = await db.insert(products).values(payload).returning();
        productId = created!.id;
        stats.created += 1;
      }

      if (row.oem) {
        await db.delete(productOems).where(eq(productOems.productId, productId));
        await db.insert(productOems).values({
          productId,
          raw: row.oem,
          normalized: normalizeOem(row.oem),
        });
      }

      if (row.category) {
        const cat = await upsertCategory(row.category);
        await db.delete(productCategories).where(eq(productCategories.productId, productId));
        await db.insert(productCategories).values({ productId, categoryId: cat.id });
      }

      if (row.vehicleBrand && row.vehicleModel) {
        const brand = await upsertBrand(row.vehicleBrand);
        const model = await upsertModel(brand.id, row.vehicleModel);
        const gen = row.vehicleGeneration ? await upsertGeneration(model.id, row.vehicleGeneration) : null;
        const engine = gen && row.vehicleEngine ? await upsertEngine(gen.id, row.vehicleEngine) : null;
        await db.delete(productFitments).where(eq(productFitments.productId, productId));
        await db.insert(productFitments).values({
          productId,
          vehicleBrandId: brand.id,
          vehicleModelId: model.id,
          vehicleGenerationId: gen?.id ?? null,
          vehicleEngineId: engine?.id ?? null,
        });
      }
    } catch (err) {
      stats.failed += 1;
      await db.insert(xmlImportRowErrors).values({
        runId,
        externalId: row.externalId,
        message: err instanceof Error ? err.message : "unknown",
        payload: row,
      });
    }
  }
}

export async function runXmlImport(feedId: string) {
  const [feed] = await db.select().from(xmlFeeds).where(eq(xmlFeeds.id, feedId)).limit(1);
  if (!feed) throw new Error("Feed bulunamadı.");
  const [run] = await db
    .insert(xmlImportRuns)
    .values({ feedId, status: IMPORT_RUN_STATUS.RUNNING, startedAt: new Date().toISOString() })
    .returning();

    const stats: ImportStats = { created: 0, updated: 0, unchanged: 0, failed: 0, inactivated: 0, total: 0 };
  const seenExternalIds: string[] = [];

  try {
    let stream: Readable;
    if (feed.filePath) {
      stream = createReadStream(feed.filePath);
    } else if (feed.url) {
      const res = await fetch(feed.url);
      if (!res.ok || !res.body) throw new Error("Feed indirilemedi.");
      stream = Readable.fromWeb(res.body as never);
    } else {
      throw new Error("Feed URL veya dosya yok.");
    }

    const rawItems = await parseProductXml(stream);
    stats.total = rawItems.length;
    const mapping = feed.mapping as XmlFieldMapping;
    const mapped = rawItems.map((raw) => mapRaw(raw, mapping)).filter((x): x is MappedProduct => x !== null);

    for (let i = 0; i < mapped.length; i += XML_BATCH_SIZE) {
      const batch = mapped.slice(i, i + XML_BATCH_SIZE);
      seenExternalIds.push(...batch.map((b) => b.externalId));
      await processBatch(feed.supplierId, batch, stats, run!.id);
    }

    if (seenExternalIds.length > 0 && seenExternalIds.length < 20_000) {
      const missing = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.supplierId, feed.supplierId),
            eq(products.source, PRODUCT_SOURCE.XML),
            sql`${products.externalId} not in (${sql.join(
              seenExternalIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          ),
        );
      if (missing.length > 0) {
        await db
          .update(products)
          .set({ status: PRODUCT_STATUS.MISSING_FROM_FEED })
          .where(inArray(products.id, missing.map((m) => m.id)));
        stats.inactivated = missing.length;
      }
    }

    await compileVisibility(db);
    const status =
      stats.failed > 0 ? IMPORT_RUN_STATUS.COMPLETED_WITH_WARNINGS : IMPORT_RUN_STATUS.COMPLETED;
    await db
      .update(xmlImportRuns)
      .set({
        status,
        finishedAt: new Date().toISOString(),
        total: stats.total,
        createdCount: stats.created,
        updatedCount: stats.updated,
        unchangedCount: stats.unchanged,
        failedCount: stats.failed,
        inactivatedCount: stats.inactivated,
      })
      .where(eq(xmlImportRuns.id, run!.id));
    return { runId: run!.id, ...stats, status };
  } catch (err) {
    await db
      .update(xmlImportRuns)
      .set({
        status: IMPORT_RUN_STATUS.FAILED,
        finishedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : "unknown",
      })
      .where(eq(xmlImportRuns.id, run!.id));
    throw err;
  }
}
