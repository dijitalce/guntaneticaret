import { and, asc, count, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import {
  categories,
  compileVisibility,
  db,
  manufacturers,
  productCategories,
  productFitments,
  productImages,
  productOems,
  products,
  tenantCatalogIndex,
  tenantVisibleBrands,
  vehicleBrands,
  vehicleEngines,
  vehicleGenerations,
  vehicleModels,
} from "@guntan/db";
import { LISTING_PAGE_SIZE, LISTING_SORT, PRODUCT_SOURCE, type ListingSort } from "@guntan/types";

export { compileVisibility };

export function productImageUrl(
  productUrl: string | null | undefined,
  tenantPlaceholder: string | null | undefined,
  globalPlaceholder = "/placeholder-product.jpg",
): string {
  return productUrl || tenantPlaceholder || globalPlaceholder;
}

export async function listVisibleBrands(tenantId: string) {
  return db
    .select({
      id: vehicleBrands.id,
      name: vehicleBrands.name,
      slug: vehicleBrands.slug,
      logoUrl: vehicleBrands.logoUrl,
    })
    .from(tenantVisibleBrands)
    .innerJoin(vehicleBrands, eq(tenantVisibleBrands.brandId, vehicleBrands.id))
    .where(eq(tenantVisibleBrands.tenantId, tenantId))
    .orderBy(asc(vehicleBrands.sortOrder), asc(vehicleBrands.name));
}

export async function getBrandBySlug(tenantId: string, slug: string) {
  const [row] = await db
    .select({
      id: vehicleBrands.id,
      name: vehicleBrands.name,
      slug: vehicleBrands.slug,
      logoUrl: vehicleBrands.logoUrl,
      seoContent: vehicleBrands.seoContent,
    })
    .from(tenantVisibleBrands)
    .innerJoin(vehicleBrands, eq(tenantVisibleBrands.brandId, vehicleBrands.id))
    .where(and(eq(tenantVisibleBrands.tenantId, tenantId), eq(vehicleBrands.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function listModelsForBrand(tenantId: string, brandId: string) {
  return db
    .select({
      id: vehicleModels.id,
      name: vehicleModels.name,
      slug: vehicleModels.slug,
      imageUrl: vehicleModels.imageUrl,
    })
    .from(vehicleModels)
    .innerJoin(tenantVisibleBrands, and(
      eq(tenantVisibleBrands.brandId, vehicleModels.brandId),
      eq(tenantVisibleBrands.tenantId, tenantId),
    ))
    .where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.isActive, true)))
    .orderBy(asc(vehicleModels.sortOrder), asc(vehicleModels.name));
}

export async function getModelBySlug(brandId: string, slug: string) {
  const [row] = await db
    .select()
    .from(vehicleModels)
    .where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function getCategoryBySlug(slug: string) {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
}

export async function getCategoryById(id: string) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row ?? null;
}

async function categoryFilterIds(categoryId: string) {
  const children = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, categoryId));
  return [categoryId, ...children.map((c) => c.id)];
}

export type ListingQuery = {
  tenantId: string;
  brandId: string;
  modelId?: string;
  categoryId?: string;
  manufacturerId?: string;
  engineId?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ListingSort;
  page?: number;
};

export async function listProducts(query: ListingQuery) {
  const page = Math.max(1, query.page ?? 1);
  const sort = query.sort ?? LISTING_SORT.RECOMMENDED;

  const conditions = [
    eq(tenantCatalogIndex.tenantId, query.tenantId),
    eq(productFitments.vehicleBrandId, query.brandId),
    eq(products.status, "active"),
  ];
  if (query.modelId) conditions.push(eq(productFitments.vehicleModelId, query.modelId));
  if (query.engineId) conditions.push(eq(productFitments.vehicleEngineId, query.engineId));
  if (query.manufacturerId) conditions.push(eq(products.manufacturerId, query.manufacturerId));
  if (query.inStock) conditions.push(eq(products.stockStatus, "in_stock"));
  if (query.minPrice != null) conditions.push(gte(products.price, String(query.minPrice)));
  if (query.maxPrice != null) conditions.push(lte(products.price, String(query.maxPrice)));

  const base = db
    .selectDistinct({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      stockStatus: products.stockStatus,
      manufacturerName: manufacturers.name,
      createdAt: products.createdAt,
      stockQty: products.stockQty,
    })
    .from(products)
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
    .innerJoin(productFitments, eq(productFitments.productId, products.id))
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id));

  const categoryIds = query.categoryId ? await categoryFilterIds(query.categoryId) : null;

  const filtered = categoryIds
    ? base.innerJoin(productCategories, eq(productCategories.productId, products.id)).where(
        and(...conditions, inArray(productCategories.categoryId, categoryIds)),
      )
    : base.where(and(...conditions));

  const order =
    sort === LISTING_SORT.PRICE_ASC
      ? asc(products.price)
      : sort === LISTING_SORT.PRICE_DESC
        ? desc(products.price)
        : sort === LISTING_SORT.NEW
          ? desc(products.createdAt)
          : desc(products.stockQty);

  const rows = await filtered
    .orderBy(order)
    .limit(LISTING_PAGE_SIZE)
    .offset((page - 1) * LISTING_PAGE_SIZE);

  const countQuery = db
    .select({ value: sql<number>`count(distinct ${products.id})` })
    .from(products)
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
    .innerJoin(productFitments, eq(productFitments.productId, products.id));

  const countRows = categoryIds
    ? await countQuery
        .innerJoin(productCategories, eq(productCategories.productId, products.id))
        .where(and(...conditions, inArray(productCategories.categoryId, categoryIds)))
    : await countQuery.where(and(...conditions));
  const total = countRows[0]?.value ?? 0;

  const ids = rows.map((r) => r.id);
  const images = ids.length
    ? await db.select().from(productImages).where(inArray(productImages.productId, ids))
    : [];
  const oems = ids.length
    ? await db.select().from(productOems).where(inArray(productOems.productId, ids))
    : [];
  const imageBy = new Map<string, string>();
  for (const img of images.sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!imageBy.has(img.productId)) imageBy.set(img.productId, img.url);
  }
  const oemBy = new Map<string, string>();
  for (const oem of oems) {
    if (!oemBy.has(oem.productId)) oemBy.set(oem.productId, oem.raw);
  }

  return {
    items: rows.map((r) => ({
      ...r,
      imageUrl: imageBy.get(r.id) ?? null,
      oem: oemBy.get(r.id) ?? null,
    })),
    total: Number(total),
    page,
    pageSize: LISTING_PAGE_SIZE,
  };
}

export async function listingFacets(tenantId: string, brandId: string, modelId?: string) {
  const scope = [
    eq(tenantCatalogIndex.tenantId, tenantId),
    eq(productFitments.vehicleBrandId, brandId),
    eq(products.status, "active"),
    ...(modelId ? [eq(productFitments.vehicleModelId, modelId)] : []),
  ];

  const catLeaves = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
      count: count(sql`distinct ${products.id}`),
    })
    .from(productCategories)
    .innerJoin(categories, eq(productCategories.categoryId, categories.id))
    .innerJoin(products, eq(products.id, productCategories.productId))
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
    .innerJoin(productFitments, eq(productFitments.productId, products.id))
    .where(and(...scope))
    .groupBy(categories.id, categories.name, categories.slug, categories.parentId);

  const parentIds = [...new Set(catLeaves.map((c) => c.parentId).filter((id): id is string => Boolean(id)))];
  const parents = parentIds.length
    ? await db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).where(inArray(categories.id, parentIds))
    : [];
  const parentById = new Map(parents.map((p) => [p.id, p]));
  const rolled = new Map<string, { id: string; name: string; slug: string; count: number }>();
  for (const leaf of catLeaves) {
    const parent = leaf.parentId ? parentById.get(leaf.parentId) : undefined;
    const key = parent?.id ?? leaf.id;
    const add = Number(leaf.count);
    const current = rolled.get(key);
    if (current) current.count += add;
    else {
      rolled.set(key, {
        id: parent?.id ?? leaf.id,
        name: parent?.name ?? leaf.name,
        slug: parent?.slug ?? leaf.slug,
        count: add,
      });
    }
  }
  const cats = [...rolled.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"));

  const mfrs = await db
    .select({
      id: manufacturers.id,
      name: manufacturers.name,
      slug: manufacturers.slug,
    })
    .from(products)
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
    .innerJoin(productFitments, eq(productFitments.productId, products.id))
    .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(and(...scope))
    .groupBy(manufacturers.id, manufacturers.name, manufacturers.slug);

  const engines = await db
    .select({
      id: vehicleEngines.id,
      name: vehicleEngines.name,
      slug: vehicleEngines.slug,
    })
    .from(productFitments)
    .innerJoin(vehicleEngines, eq(productFitments.vehicleEngineId, vehicleEngines.id))
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, productFitments.productId))
    .where(
      and(
        eq(tenantCatalogIndex.tenantId, tenantId),
        eq(productFitments.vehicleBrandId, brandId),
        ...(modelId ? [eq(productFitments.vehicleModelId, modelId)] : []),
      ),
    )
    .groupBy(vehicleEngines.id, vehicleEngines.name, vehicleEngines.slug);

  return { categories: cats, manufacturers: mfrs, engines };
}

export async function getProductBySlug(tenantId: string, slug: string) {
  const [row] = await db
    .select({
      product: products,
      manufacturerName: manufacturers.name,
    })
    .from(products)
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(and(eq(tenantCatalogIndex.tenantId, tenantId), eq(products.slug, slug)))
    .limit(1);
  if (!row) return null;

  const images = await db.select().from(productImages).where(eq(productImages.productId, row.product.id));
  const oems = await db.select().from(productOems).where(eq(productOems.productId, row.product.id));
  const cats = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(productCategories)
    .innerJoin(categories, eq(productCategories.categoryId, categories.id))
    .where(eq(productCategories.productId, row.product.id));
  const fitments = await db
    .select({
      brandName: vehicleBrands.name,
      brandSlug: vehicleBrands.slug,
      modelName: vehicleModels.name,
      modelSlug: vehicleModels.slug,
      modelId: vehicleModels.id,
      generationName: vehicleGenerations.name,
      engineName: vehicleEngines.name,
      yearFrom: productFitments.yearFrom,
      yearTo: productFitments.yearTo,
    })
    .from(productFitments)
    .innerJoin(vehicleBrands, eq(productFitments.vehicleBrandId, vehicleBrands.id))
    .innerJoin(vehicleModels, eq(productFitments.vehicleModelId, vehicleModels.id))
    .leftJoin(vehicleGenerations, eq(productFitments.vehicleGenerationId, vehicleGenerations.id))
    .leftJoin(vehicleEngines, eq(productFitments.vehicleEngineId, vehicleEngines.id))
    .where(eq(productFitments.productId, row.product.id));

  return { ...row, images, oems, categories: cats, fitments };
}

export async function relatedProducts(tenantId: string, productId: string, modelId: string | undefined, limit = 8) {
  if (!modelId) return [];
  return db
    .selectDistinct({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
    })
    .from(products)
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
    .innerJoin(productFitments, eq(productFitments.productId, products.id))
    .where(
      and(
        eq(tenantCatalogIndex.tenantId, tenantId),
        eq(productFitments.vehicleModelId, modelId),
        eq(products.status, "active"),
        sql`${products.id} <> ${productId}`,
      ),
    )
    .limit(limit);
}

export async function featuredProducts(tenantId: string, limit = 8) {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      sku: products.sku,
      manufacturerName: manufacturers.name,
      stockStatus: products.stockStatus,
    })
    .from(products)
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(and(
      eq(tenantCatalogIndex.tenantId, tenantId),
      eq(products.status, "active"),
      eq(products.source, PRODUCT_SOURCE.XML),
    ))
    .orderBy(desc(products.stockQty), desc(products.updatedAt))
    .limit(limit);
}

export async function listPopularCategories(limit = 8) {
  return db.select().from(categories).where(and(eq(categories.isActive, true), isNull(categories.parentId))).orderBy(asc(categories.sortOrder)).limit(limit);
}

function foldTr(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

function foldCol(col: typeof products.name | typeof products.sku) {
  return sql`translate(lower(${col}::text), 'ıİğĞüÜşŞöÖçÇ', 'iigguussoocc')`;
}

export async function searchCatalog(tenantId: string, q: string, limit = 8) {
  const query = q.trim();
  if (query.length < 2) return [];
  const folded = `%${foldTr(query)}%`;
  const oemNorm = query.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const matchOem =
    oemNorm.length >= 2
      ? sql`exists (
          select 1 from product_oems po
          where po.product_id = ${products.id}
            and (po.raw ilike ${`%${query}%`} or po.normalized = ${oemNorm})
        )`
      : sql`false`;
  return db
    .select({
      id: products.id,
      title: products.name,
      slug: products.slug,
      sku: products.sku,
      price: products.price,
      manufacturer: manufacturers.name,
    })
    .from(products)
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(
      and(
        eq(tenantCatalogIndex.tenantId, tenantId),
        eq(products.status, "active"),
        or(sql`${foldCol(products.name)} like ${folded}`, sql`${foldCol(products.sku)} like ${folded}`, matchOem),
      ),
    )
    .limit(limit);
}
