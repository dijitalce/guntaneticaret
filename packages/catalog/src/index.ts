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
import { LISTING_PAGE_SIZE, LISTING_SORT, type ListingSort } from "@guntan/types";

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
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
    .orderBy(asc(categories.path))
    .limit(1);
  return row ?? null;
}

export async function getCategoryById(id: string) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row ?? null;
}

/** Category + all descendants via path prefix (supports nested trees). */
async function categoryFilterIds(categoryId: string) {
  const [cat] = await db
    .select({ id: categories.id, path: categories.path })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  if (!cat) return [categoryId];
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(or(eq(categories.id, categoryId), sql`${categories.path} like ${`${cat.path}/%`}`));
  return rows.map((r) => r.id);
}

async function primaryImagesByProductIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const images = await db.select().from(productImages).where(inArray(productImages.productId, ids));
  const imageBy = new Map<string, string>();
  for (const img of images.sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!imageBy.has(img.productId)) imageBy.set(img.productId, img.url);
  }
  return imageBy;
}

async function primaryOemsByProductIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const oems = await db.select().from(productOems).where(inArray(productOems.productId, ids));
  const oemBy = new Map<string, string>();
  for (const oem of oems) {
    if (!oemBy.has(oem.productId)) oemBy.set(oem.productId, oem.raw);
  }
  return oemBy;
}

export type ListingQuery = {
  tenantId: string;
  brandId?: string;
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

function listingOrder(sort: ListingSort) {
  if (sort === LISTING_SORT.PRICE_ASC) return asc(products.price);
  if (sort === LISTING_SORT.PRICE_DESC) return desc(products.price);
  if (sort === LISTING_SORT.NEW) return desc(products.createdAt);
  return desc(products.stockQty);
}

export async function listProducts(query: ListingQuery) {
  const page = Math.max(1, query.page ?? 1);
  const sort = query.sort ?? LISTING_SORT.RECOMMENDED;

  const conditions = [
    eq(tenantCatalogIndex.tenantId, query.tenantId),
    eq(products.status, "active"),
  ];

  if (query.manufacturerId) conditions.push(eq(products.manufacturerId, query.manufacturerId));
  if (query.inStock) conditions.push(eq(products.stockStatus, "in_stock"));
  if (query.minPrice != null) conditions.push(gte(products.price, String(query.minPrice)));
  if (query.maxPrice != null) conditions.push(lte(products.price, String(query.maxPrice)));

  if (query.brandId || query.modelId || query.engineId) {
    const fitConds = [sql`pf.product_id = ${products.id}`];
    if (query.brandId) fitConds.push(sql`pf.vehicle_brand_id = ${query.brandId}`);
    if (query.modelId) fitConds.push(sql`pf.vehicle_model_id = ${query.modelId}`);
    if (query.engineId) fitConds.push(sql`pf.vehicle_engine_id = ${query.engineId}`);
    conditions.push(sql`exists (select 1 from product_fitments pf where ${sql.join(fitConds, sql` and `)})`);
  }

  if (query.categoryId) {
    const categoryIds = await categoryFilterIds(query.categoryId);
    if (categoryIds.length === 0) {
      return { items: [], total: 0, page, pageSize: LISTING_PAGE_SIZE };
    }
    conditions.push(sql`exists (
      select 1 from product_categories pc
      where pc.product_id = ${products.id}
        and pc.category_id in (${sql.join(categoryIds.map((id) => sql`${id}::uuid`), sql`, `)})
    )`);
  }

  const whereClause = and(...conditions);
  const order = listingOrder(sort);

  const [rows, countRows] = await Promise.all([
    db
      .select({
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
      .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(whereClause)
      .orderBy(order)
      .limit(LISTING_PAGE_SIZE)
      .offset((page - 1) * LISTING_PAGE_SIZE),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(products)
      .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
      .where(whereClause),
  ]);

  const total = countRows[0]?.value ?? 0;
  const ids = rows.map((r) => r.id);
  const [imageBy, oemBy] = await Promise.all([
    primaryImagesByProductIds(ids),
    primaryOemsByProductIds(ids),
  ]);

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

  const [catLeaves, mfrs, engines] = await Promise.all([
    db
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
      .groupBy(categories.id, categories.name, categories.slug, categories.parentId),
    db
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
      .groupBy(manufacturers.id, manufacturers.name, manufacturers.slug),
    db
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
      .groupBy(vehicleEngines.id, vehicleEngines.name, vehicleEngines.slug),
  ]);

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

  return { categories: cats, manufacturers: mfrs, engines };
}

/** Kategori sayfası için üretici + araç markası facet’leri. */
export async function listingFacetsForCategory(tenantId: string, categoryId: string) {
  const categoryIds = await categoryFilterIds(categoryId);
  if (categoryIds.length === 0) {
    return { manufacturers: [] as { id: string; name: string; slug: string; count: number }[], brands: [] as { id: string; name: string; slug: string; count: number }[], children: [] as { id: string; name: string; slug: string; count: number }[] };
  }

  const catIn = sql.join(categoryIds.map((id) => sql`${id}::uuid`), sql`, `);
  const inCategory = sql`exists (
    select 1 from product_categories pc
    where pc.product_id = ${products.id}
      and pc.category_id in (${catIn})
  )`;

  const scope = [
    eq(tenantCatalogIndex.tenantId, tenantId),
    eq(products.status, "active"),
    inCategory,
  ];

  const [mfrs, brands, children] = await Promise.all([
    db
      .select({
        id: manufacturers.id,
        name: manufacturers.name,
        slug: manufacturers.slug,
        count: count(products.id),
      })
      .from(products)
      .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
      .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(and(...scope))
      .groupBy(manufacturers.id, manufacturers.name, manufacturers.slug)
      .orderBy(desc(count(products.id)))
      .limit(40),
    db
      .select({
        id: vehicleBrands.id,
        name: vehicleBrands.name,
        slug: vehicleBrands.slug,
        count: count(sql`distinct ${products.id}`),
      })
      .from(products)
      .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
      .innerJoin(productFitments, eq(productFitments.productId, products.id))
      .innerJoin(vehicleBrands, eq(productFitments.vehicleBrandId, vehicleBrands.id))
      .where(and(...scope))
      .groupBy(vehicleBrands.id, vehicleBrands.name, vehicleBrands.slug)
      .orderBy(desc(count(sql`distinct ${products.id}`)))
      .limit(40),
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        count: count(sql`distinct ${products.id}`),
      })
      .from(categories)
      .innerJoin(productCategories, eq(productCategories.categoryId, categories.id))
      .innerJoin(products, eq(products.id, productCategories.productId))
      .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
      .where(
        and(
          eq(categories.parentId, categoryId),
          eq(tenantCatalogIndex.tenantId, tenantId),
          eq(products.status, "active"),
        ),
      )
      .groupBy(categories.id, categories.name, categories.slug)
      .orderBy(desc(count(sql`distinct ${products.id}`))),
  ]);

  return {
    manufacturers: mfrs.map((m) => ({ ...m, count: Number(m.count) })),
    brands: brands.map((b) => ({ ...b, count: Number(b.count) })),
    children: children.map((c) => ({ ...c, count: Number(c.count) })),
  };
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

  const [images, oems, cats, fitments] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, row.product.id)),
    db.select().from(productOems).where(eq(productOems.productId, row.product.id)),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(eq(productCategories.productId, row.product.id)),
    db
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
      .where(eq(productFitments.productId, row.product.id)),
  ]);

  return { ...row, images, oems, categories: cats, fitments };
}

export async function relatedProducts(tenantId: string, productId: string, modelId: string | undefined, limit = 8) {
  if (!modelId) return [];
  const rows = await db
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
  const imageBy = await primaryImagesByProductIds(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, imageUrl: imageBy.get(r.id) ?? null }));
}

export async function featuredProducts(tenantId: string, limit = 8) {
  const rows = await db
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
    ))
    .orderBy(desc(products.stockQty), desc(products.updatedAt))
    .limit(limit);
  const imageBy = await primaryImagesByProductIds(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, imageUrl: imageBy.get(r.id) ?? null }));
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
