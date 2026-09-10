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
  tenantSeesAllCatalog,
  tenantVisibleBrands,
  vehicleBrands,
  vehicleEngines,
  vehicleGenerations,
  vehicleModels,
} from "@guntan/db";
import { LISTING_PAGE_SIZE, LISTING_SORT, type ListingSort } from "@guntan/types";

export { compileVisibility };

function tenantVisibleSql(tenantId: string, seesAll: boolean) {
  if (seesAll) return sql`true`;
  return sql`exists (
    select 1 from tenant_catalog_index tci
    where tci.product_id = ${products.id}
      and tci.tenant_id = ${tenantId}
  )`;
}

const listingSelect = {
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
};

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

export async function getManufacturerBySlug(slug: string) {
  const [row] = await db
    .select({
      id: manufacturers.id,
      name: manufacturers.name,
      slug: manufacturers.slug,
    })
    .from(manufacturers)
    .where(eq(manufacturers.slug, slug))
    .limit(1);
  return row ?? null;
}

const CAT_ID_TTL_MS = 10 * 60_000;
const catIdMem = new Map<string, { exp: number; value: string[] }>();

/** Category + all descendants via path prefix (supports nested trees). */
async function categoryFilterIds(categoryId: string) {
  const hit = catIdMem.get(categoryId);
  if (hit && hit.exp > Date.now()) return hit.value;
  const [cat] = await db
    .select({ id: categories.id, path: categories.path })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  const ids = !cat
    ? [categoryId]
    : (await db
        .select({ id: categories.id })
        .from(categories)
        .where(or(eq(categories.id, categoryId), sql`${categories.path} like ${`${cat.path}/%`}`))
      ).map((r) => r.id);
  if (catIdMem.size > 400) catIdMem.clear();
  catIdMem.set(categoryId, { value: ids, exp: Date.now() + CAT_ID_TTL_MS });
  return ids;
}

async function primaryImagesByProductIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const images = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(inArray(productImages.productId, ids));
  const imageBy = new Map<string, string>();
  for (const img of images.sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!imageBy.has(img.productId)) imageBy.set(img.productId, img.url);
  }
  return imageBy;
}

async function primaryOemsByProductIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const oems = await db
    .select({
      productId: productOems.productId,
      raw: productOems.raw,
    })
    .from(productOems)
    .where(inArray(productOems.productId, ids));
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

type ListingResult = Awaited<ReturnType<typeof listProductsUncached>>;

const LISTING_MEM_TTL_MS = 90_000;
const listingMem = new Map<string, { exp: number; value: ListingResult }>();

function listingCacheKey(query: ListingQuery) {
  return [
    query.tenantId,
    query.brandId ?? "",
    query.modelId ?? "",
    query.categoryId ?? "",
    query.manufacturerId ?? "",
    query.engineId ?? "",
    query.inStock ? "1" : "0",
    query.minPrice ?? "",
    query.maxPrice ?? "",
    query.sort ?? "",
    query.page ?? 1,
  ].join("|");
}

function listingMemGet(key: string): ListingResult | undefined {
  const hit = listingMem.get(key);
  if (!hit) return undefined;
  if (hit.exp < Date.now()) {
    listingMem.delete(key);
    return undefined;
  }
  return hit.value;
}

function listingMemSet(key: string, value: ListingResult) {
  if (listingMem.size > 250) {
    const now = Date.now();
    for (const [k, v] of listingMem) {
      if (v.exp < now) listingMem.delete(k);
    }
    if (listingMem.size > 250) listingMem.clear();
  }
  listingMem.set(key, { value, exp: Date.now() + LISTING_MEM_TTL_MS });
}

export async function listProducts(query: ListingQuery) {
  const key = listingCacheKey(query);
  const cached = listingMemGet(key);
  if (cached) return cached;
  const value = await listProductsUncached(query);
  listingMemSet(key, value);
  return value;
}

async function listProductsUncached(query: ListingQuery) {
  const page = Math.max(1, query.page ?? 1);
  const sort = query.sort ?? LISTING_SORT.RECOMMENDED;
  const offset = (page - 1) * LISTING_PAGE_SIZE;
  const seesAll = await tenantSeesAllCatalog(query.tenantId);
  const visible = tenantVisibleSql(query.tenantId, seesAll);
  const order = listingOrder(sort);

  const conditions = [eq(products.status, "active"), visible];
  if (query.manufacturerId) conditions.push(eq(products.manufacturerId, query.manufacturerId));
  if (query.inStock) conditions.push(eq(products.stockStatus, "in_stock"));
  if (query.minPrice != null) conditions.push(gte(products.price, String(query.minPrice)));
  if (query.maxPrice != null) conditions.push(lte(products.price, String(query.maxPrice)));

  let categoryIds: string[] | undefined;
  if (query.categoryId) {
    categoryIds = await categoryFilterIds(query.categoryId);
    if (categoryIds.length === 0) {
      return { items: [], total: 0, page, pageSize: LISTING_PAGE_SIZE };
    }
  }

  const useFitments = Boolean(query.brandId || query.modelId || query.engineId);
  const useCategories = Boolean(categoryIds?.length) && !useFitments;

  if (useFitments) {
    const fitmentConds = [];
    if (query.brandId) fitmentConds.push(eq(productFitments.vehicleBrandId, query.brandId));
    if (query.modelId) fitmentConds.push(eq(productFitments.vehicleModelId, query.modelId));
    if (query.engineId) fitmentConds.push(eq(productFitments.vehicleEngineId, query.engineId));
    if (categoryIds?.length) {
      conditions.push(sql`exists (
        select 1 from product_categories pc
        where pc.product_id = ${products.id}
          and pc.category_id in (${sql.join(categoryIds.map((id) => sql`${id}::uuid`), sql`, `)})
      )`);
    }
    const fitIds = db
      .selectDistinct({ productId: productFitments.productId })
      .from(productFitments)
      .where(and(...fitmentConds))
      .as("fit_ids");
    const whereClause = and(...conditions);
    const [rows, countRows] = await Promise.all([
      db
        .select(listingSelect)
        .from(fitIds)
        .innerJoin(products, eq(products.id, fitIds.productId))
        .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
        .where(whereClause)
        .orderBy(order)
        .limit(LISTING_PAGE_SIZE)
        .offset(offset),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(fitIds)
        .innerJoin(products, eq(products.id, fitIds.productId))
        .where(whereClause),
    ]);
    return attachListingExtras(rows, countRows[0]?.value ?? 0, page);
  }

  if (useCategories) {
    const whereClause = and(...conditions, inArray(productCategories.categoryId, categoryIds!));
    const fromCategory = () =>
      db
        .select(listingSelect)
        .from(productCategories)
        .innerJoin(products, eq(products.id, productCategories.productId))
        .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
        .where(whereClause);
    const countFromCategory = () =>
      db
        .select({
          value: sql<number>`count(distinct ${productCategories.productId})::int`,
        })
        .from(productCategories)
        .innerJoin(products, eq(products.id, productCategories.productId))
        .where(whereClause);

    const [rows, countRows] = await Promise.all([
      categoryIds!.length === 1
        ? fromCategory().orderBy(order).limit(LISTING_PAGE_SIZE).offset(offset)
        : fromCategory()
            .groupBy(
              products.id,
              products.name,
              products.slug,
              products.sku,
              products.price,
              products.compareAtPrice,
              products.stockStatus,
              manufacturers.name,
              products.createdAt,
              products.stockQty,
            )
            .orderBy(order)
            .limit(LISTING_PAGE_SIZE)
            .offset(offset),
      countFromCategory(),
    ]);
    return attachListingExtras(rows, countRows[0]?.value ?? 0, page);
  }

  const whereClause = and(...conditions);
  const [rows, countRows] = await Promise.all([
    db
      .select(listingSelect)
      .from(products)
      .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(whereClause)
      .orderBy(order)
      .limit(LISTING_PAGE_SIZE)
      .offset(offset),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause),
  ]);
  return attachListingExtras(rows, countRows[0]?.value ?? 0, page);
}

async function attachListingExtras(
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: string;
    compareAtPrice: string | null;
    stockStatus: string;
    manufacturerName: string | null;
    createdAt: Date;
    stockQty: number;
  }>,
  total: number,
  page: number,
) {
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
  const seesAll = await tenantSeesAllCatalog(tenantId);
  const visible = tenantVisibleSql(tenantId, seesAll);
  const scope = [
    visible,
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
      .innerJoin(products, eq(products.id, productFitments.productId))
      .where(
        and(
          visible,
          eq(productFitments.vehicleBrandId, brandId),
          eq(products.status, "active"),
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

type CategoryFacets = {
  manufacturers: { id: string; name: string; slug: string; count: number }[];
  brands: { id: string; name: string; slug: string; count: number }[];
  children: { id: string; name: string; slug: string; count: number }[];
};

const CATEGORY_FACET_TTL_MS = 10 * 60_000;
const categoryFacetMem = new Map<string, { exp: number; value: CategoryFacets }>();

/** Kategori sayfası için üretici + alt kategori facet’leri. */
export async function listingFacetsForCategory(tenantId: string, categoryId: string) {
  const key = `${tenantId}:${categoryId}`;
  const hit = categoryFacetMem.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await listingFacetsForCategoryUncached(tenantId, categoryId);
  if (categoryFacetMem.size > 200) categoryFacetMem.clear();
  categoryFacetMem.set(key, { value, exp: Date.now() + CATEGORY_FACET_TTL_MS });
  return value;
}

async function listingFacetsForCategoryUncached(tenantId: string, categoryId: string): Promise<CategoryFacets> {
  const categoryIds = await categoryFilterIds(categoryId);
  if (categoryIds.length === 0) {
    return { manufacturers: [], brands: [], children: [] };
  }

  const seesAll = await tenantSeesAllCatalog(tenantId);
  const visible = tenantVisibleSql(tenantId, seesAll);
  const inTheseCategories = inArray(productCategories.categoryId, categoryIds);
  const productCount = sql<number>`count(distinct ${productCategories.productId})::int`;

  const mfrsQuery = db
    .select({
      id: manufacturers.id,
      name: manufacturers.name,
      slug: manufacturers.slug,
      count: productCount,
    })
    .from(productCategories)
    .innerJoin(products, eq(products.id, productCategories.productId))
    .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(and(inTheseCategories, eq(products.status, "active"), visible))
    .groupBy(manufacturers.id, manufacturers.name, manufacturers.slug)
    .orderBy(desc(productCount))
    .limit(40);

  // Alt kategori say\u0131lar\u0131 kozmetik bir rakam; products tablosuna hi\u00e7 dokunmadan
  // (status kontrol\u00fc olmadan) hesaplamak, planlayıcının products'ı tam taramasını
  // \u00f6nler (t4g.micro'da bu tarama disk I/O'ya d\u00fc\u015f\u00fcp saniyeler s\u00fcrebiliyordu).
  const childrenQuery = db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      count: sql<number>`count(distinct ${productCategories.productId})::int`,
    })
    .from(categories)
    .innerJoin(productCategories, eq(productCategories.categoryId, categories.id))
    .where(eq(categories.parentId, categoryId))
    .groupBy(categories.id, categories.name, categories.slug)
    .orderBy(desc(sql`count(distinct ${productCategories.productId})`));

  // Ana kategoride tüm fitment’lerle COUNT DISTINCT marka = saniye mertebesi.
  // Yaprak kategoride ürün azdır; orada hesapla. Üst kategoride alt kategori yeterli.
  const isLeaf = categoryIds.length === 1;
  const brandsQuery = isLeaf
    ? db
        .select({
          id: vehicleBrands.id,
          name: vehicleBrands.name,
          slug: vehicleBrands.slug,
          count: productCount,
        })
        .from(productCategories)
        .innerJoin(products, eq(products.id, productCategories.productId))
        .innerJoin(productFitments, eq(productFitments.productId, productCategories.productId))
        .innerJoin(vehicleBrands, eq(productFitments.vehicleBrandId, vehicleBrands.id))
        .where(and(inTheseCategories, eq(products.status, "active"), visible))
        .groupBy(vehicleBrands.id, vehicleBrands.name, vehicleBrands.slug)
        .orderBy(desc(productCount))
        .limit(40)
    : Promise.resolve([] as { id: string; name: string; slug: string; count: number }[]);

  const [mfrs, brands, children] = await Promise.all([mfrsQuery, brandsQuery, childrenQuery]);

  return {
    manufacturers: mfrs.map((m) => ({ ...m, count: Number(m.count) })),
    brands: brands.map((b) => ({ ...b, count: Number(b.count) })),
    children: children.map((c) => ({ ...c, count: Number(c.count) })),
  };
}

export async function getProductBySlug(tenantId: string, slug: string) {
  const seesAll = await tenantSeesAllCatalog(tenantId);
  const [row] = await db
    .select({
      product: products,
      manufacturerName: manufacturers.name,
    })
    .from(products)
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(and(
      eq(products.slug, slug),
      eq(products.status, "active"),
      tenantVisibleSql(tenantId, seesAll),
    ))
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
  const seesAll = await tenantSeesAllCatalog(tenantId);
  const rows = await db
    .selectDistinct({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
    })
    .from(productFitments)
    .innerJoin(products, eq(products.id, productFitments.productId))
    .where(
      and(
        tenantVisibleSql(tenantId, seesAll),
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
  const seesAll = await tenantSeesAllCatalog(tenantId);
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
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(and(
      eq(products.status, "active"),
      tenantVisibleSql(tenantId, seesAll),
    ))
    .orderBy(desc(products.stockQty), desc(products.updatedAt))
    .limit(limit);
  const imageBy = await primaryImagesByProductIds(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, imageUrl: imageBy.get(r.id) ?? null }));
}

export async function listPopularCategories(limit = 8) {
  return db.select().from(categories).where(and(eq(categories.isActive, true), isNull(categories.parentId))).orderBy(asc(categories.sortOrder)).limit(limit);
}

export async function searchCatalog(tenantId: string, q: string, limit = 8) {
  const query = q.trim();
  if (query.length < 2) return [];
  const seesAll = await tenantSeesAllCatalog(tenantId);
  const prefix = `${query}%`;
  const oemNorm = query.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const matchOem =
    oemNorm.length >= 5
      ? sql`exists (
          select 1 from product_oems po
          where po.product_id = ${products.id}
            and po.normalized = ${oemNorm}
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
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(
      and(
        eq(products.status, "active"),
        tenantVisibleSql(tenantId, seesAll),
        or(
          eq(products.sku, query),
          sql`${products.sku} ilike ${prefix}`,
          sql`${products.name} ilike ${prefix}`,
          matchOem,
        ),
      ),
    )
    .limit(limit);
}
