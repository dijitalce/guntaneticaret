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

/** Yüklenen (data URI) logolar sorguda taşınmaz; vitrin rotasının adresi döner. */
export const manufacturerLogoSql = sql<string | null>`case
  when ${manufacturers.logoUrl} like 'data:%' then concat('/uretici-logo/', ${manufacturers.slug}, '?v=', unix_timestamp(${manufacturers.updatedAt}))
  else nullif(${manufacturers.logoUrl}, '')
end`;

/** Arama dizininden gelen sonuçlar için üretici adı → panelde girilen logo. */
export async function manufacturerLogosByName(names: Array<string | null | undefined>) {
  const unique = [...new Set(names.filter((n): n is string => Boolean(n)))];
  if (!unique.length) return new Map<string, string>();
  const rows = await db
    .select({ name: manufacturers.name, logo: manufacturerLogoSql })
    .from(manufacturers)
    .where(and(inArray(manufacturers.name, unique), sql`${manufacturers.logoUrl} is not null and ${manufacturers.logoUrl} <> ''`));
  return new Map(rows.filter((r) => r.logo).map((r) => [r.name, r.logo!]));
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
  manufacturerLogo: manufacturerLogoSql,
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

export type CardFitmentLink = { href: string; label: string };

/** Kartta görünen uyumlu marka/model özeti (aynı markada model adı tekrarlanmaz). */
export function formatCardFitments(
  rows: Array<{
    brandName: string;
    brandSlug: string;
    brandSort?: number | null;
    modelName: string;
    modelSlug: string;
    modelSort?: number | null;
  }>,
  maxItems = 3,
): { items: CardFitmentLink[]; extra: number } {
  const sorted = [...rows].sort(
    (a, b) =>
      (a.brandSort ?? 0) - (b.brandSort ?? 0) ||
      a.brandName.localeCompare(b.brandName, "tr") ||
      (a.modelSort ?? 0) - (b.modelSort ?? 0) ||
      a.modelName.localeCompare(b.modelName, "tr"),
  );
  const unique: typeof sorted = [];
  const seen = new Set<string>();
  for (const row of sorted) {
    const key = `${row.brandSlug}:${row.modelSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  const shown = unique.slice(0, maxItems);
  const items = shown.map((row, i) => {
    const prev = shown[i - 1];
    const sameBrand = prev?.brandSlug === row.brandSlug;
    return {
      href: `/${row.brandSlug}/${row.modelSlug}`,
      label: sameBrand ? row.modelName : `${row.brandName} ${row.modelName}`,
    };
  });
  return { items, extra: Math.max(0, unique.length - shown.length) };
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
    .where(and(eq(tenantVisibleBrands.tenantId, tenantId), eq(vehicleBrands.isActive, true)))
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
    .where(and(eq(tenantVisibleBrands.tenantId, tenantId), eq(vehicleBrands.slug, slug), eq(vehicleBrands.isActive, true)))
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
    .where(and(eq(vehicleModels.brandId, brandId), eq(vehicleModels.slug, slug), eq(vehicleModels.isActive, true)))
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

export async function cardFitmentsByProductIds(ids: string[]) {
  const byProduct = new Map<string, { items: CardFitmentLink[]; extra: number }>();
  if (ids.length === 0) return byProduct;
  const rows = await db
    .select({
      productId: productFitments.productId,
      brandName: vehicleBrands.name,
      brandSlug: vehicleBrands.slug,
      brandSort: vehicleBrands.sortOrder,
      modelName: vehicleModels.name,
      modelSlug: vehicleModels.slug,
      modelSort: vehicleModels.sortOrder,
    })
    .from(productFitments)
    .innerJoin(vehicleBrands, eq(productFitments.vehicleBrandId, vehicleBrands.id))
    .innerJoin(vehicleModels, eq(productFitments.vehicleModelId, vehicleModels.id))
    .where(inArray(productFitments.productId, ids));
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = grouped.get(row.productId);
    if (list) list.push(row);
    else grouped.set(row.productId, [row]);
  }
  for (const id of ids) {
    byProduct.set(id, formatCardFitments(grouped.get(id) ?? [], 3));
  }
  return byProduct;
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
    "fitv1",
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
          and pc.category_id in (${sql.join(categoryIds.map((id) => sql`${id}`), sql`, `)})
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
        .select({ value: sql<number>`cast(count(*) as unsigned)` })
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
          value: sql<number>`cast(count(distinct ${productCategories.productId}) as unsigned)`,
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
      .select({ value: sql<number>`cast(count(*) as unsigned)` })
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
    manufacturerLogo: string | null;
    createdAt: Date;
    stockQty: number;
  }>,
  total: number,
  page: number,
) {
  const ids = rows.map((r) => r.id);
  const [imageBy, oemBy, fitBy] = await Promise.all([
    primaryImagesByProductIds(ids),
    primaryOemsByProductIds(ids),
    cardFitmentsByProductIds(ids),
  ]);
  return {
    items: rows.map((r) => {
      const fit = fitBy.get(r.id);
      return {
        ...r,
        imageUrl: imageBy.get(r.id) ?? null,
        oem: oemBy.get(r.id) ?? null,
        fitments: fit?.items ?? [],
        fitmentExtra: fit?.extra ?? 0,
      };
    }),
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
        logo: manufacturerLogoSql,
      })
      .from(products)
      .innerJoin(productFitments, eq(productFitments.productId, products.id))
      .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(and(...scope))
      .groupBy(manufacturers.id, manufacturers.name, manufacturers.slug, manufacturers.logoUrl, manufacturers.updatedAt),
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
  manufacturers: { id: string; name: string; slug: string; logo: string | null; count: number }[];
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
  const productCount = sql<number>`cast(count(distinct ${productCategories.productId}) as unsigned)`;

  const mfrsQuery = db
    .select({
      id: manufacturers.id,
      name: manufacturers.name,
      slug: manufacturers.slug,
      logo: manufacturerLogoSql,
      count: productCount,
    })
    .from(productCategories)
    .innerJoin(products, eq(products.id, productCategories.productId))
    .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(and(inTheseCategories, eq(products.status, "active"), visible))
    .groupBy(manufacturers.id, manufacturers.name, manufacturers.slug, manufacturers.logoUrl, manufacturers.updatedAt)
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
      count: sql<number>`cast(count(distinct ${productCategories.productId}) as unsigned)`,
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
      manufacturerLogo: manufacturerLogoSql,
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
      stockStatus: products.stockStatus,
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
  const ids = rows.map((r) => r.id);
  const [imageBy, fitBy] = await Promise.all([
    primaryImagesByProductIds(ids),
    cardFitmentsByProductIds(ids),
  ]);
  return rows.map((r) => {
    const fit = fitBy.get(r.id);
    return {
      ...r,
      imageUrl: imageBy.get(r.id) ?? null,
      fitments: fit?.items ?? [],
      fitmentExtra: fit?.extra ?? 0,
    };
  });
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
      manufacturerLogo: manufacturerLogoSql,
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
  const ids = rows.map((r) => r.id);
  const [imageBy, fitBy] = await Promise.all([
    primaryImagesByProductIds(ids),
    cardFitmentsByProductIds(ids),
  ]);
  return rows.map((r) => {
    const fit = fitBy.get(r.id);
    return {
      ...r,
      imageUrl: imageBy.get(r.id) ?? null,
      fitments: fit?.items ?? [],
      fitmentExtra: fit?.extra ?? 0,
    };
  });
}

export async function listPopularCategories(limit = 8) {
  return db.select().from(categories).where(and(eq(categories.isActive, true), isNull(categories.parentId))).orderBy(asc(categories.sortOrder)).limit(limit);
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "");
}

/** Kelimeleri sıradan bağımsız AND ile aramak için tokenize et. */
export function searchTokens(q: string): string[] {
  return q
    .trim()
    .split(/[\s,;/|]+/)
    .map((t) => escapeLike(t.trim()))
    .filter((t) => t.length >= 2)
    .slice(0, 6);
}

const CONSONANT_END = /[bcçdfgğhjklmnprsştvyzqwx]$/;

/**
 * Türkçe ek budama: "diski" → "disk", "balatası" → "balata", "hortumu" → "hortum".
 * Kök her zaman kelimenin önekidir; LIKE '%kök%' aramayı sadece genişletir.
 */
export function stemToken(token: string): string {
  const t = token.toLocaleLowerCase("tr-TR");
  if (t.length > 6 && /(ları|leri|lari)$/.test(t)) return t.slice(0, -4);
  if (t.length >= 6 && /(sı|si|su|sü)$/.test(t)) return t.slice(0, -2);
  if (t.length >= 5 && /[ıiuü]$/.test(t) && CONSONANT_END.test(t.slice(0, -1))) return t.slice(0, -1);
  return t;
}

/** Kelime başında eşleşen araç markası/modeli ve üretici id'leri (çok genel kelimeler atlanır). */
async function entityIdsForToken(token: string) {
  if (token.length < 3) return { brandIds: [], modelIds: [], mfrIds: [] };
  const starts = `${token}%`;
  const wordStarts = `% ${token}%`;
  const [brands, models, mfrs] = await Promise.all([
    db.select({ id: vehicleBrands.id }).from(vehicleBrands)
      .where(or(sql`${vehicleBrands.name} like ${starts}`, sql`${vehicleBrands.name} like ${wordStarts}`))
      .limit(21),
    db.select({ id: vehicleModels.id }).from(vehicleModels)
      .where(or(sql`${vehicleModels.name} like ${starts}`, sql`${vehicleModels.name} like ${wordStarts}`))
      .limit(201),
    db.select({ id: manufacturers.id }).from(manufacturers)
      .where(or(sql`${manufacturers.name} like ${starts}`, sql`${manufacturers.name} like ${wordStarts}`))
      .limit(21),
  ]);
  return {
    brandIds: brands.length <= 20 ? brands.map((r) => r.id) : [],
    modelIds: models.length <= 200 ? models.map((r) => r.id) : [],
    mfrIds: mfrs.length <= 20 ? mfrs.map((r) => r.id) : [],
  };
}

export async function searchCatalog(tenantId: string, q: string, limit = 8) {
  const query = q.trim();
  if (query.length < 2) return [];
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];

  const [seesAll, entityIds] = await Promise.all([
    tenantSeesAllCatalog(tenantId),
    Promise.all(tokens.map((t) => entityIdsForToken(t))),
  ]);
  const oemNorm = query.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const matchOem =
    oemNorm.length >= 5
      ? sql`exists (
          select 1 from product_oems po
          where po.product_id = ${products.id}
            and po.normalized = ${oemNorm}
        )`
      : sql`false`;

  // Her kelime (sıra önemsiz) ad/SKU'da geçmeli ya da ürünün uyumlu olduğu
  // araç markası/modeli veya üretici markası olmalı. Başbuğ adlarında model,
  // Altay adlarında marka ("NISSAN") yazmadığı için ad tek başına yetmiyor.
  const namePatterns = tokens.map((token) => `%${stemToken(token)}%`);
  const tokenConds = tokens.map((_, i) => {
    const pattern = namePatterns[i]!;
    const { brandIds, modelIds, mfrIds } = entityIds[i]!;
    const conds = [
      sql`${products.name} like ${pattern}`,
      sql`${products.sku} like ${pattern}`,
    ];
    if (brandIds.length) {
      conds.push(sql`${products.id} in (
        select pf.product_id from product_fitments pf where pf.vehicle_brand_id in (${sql.join(brandIds.map((id) => sql`${id}`), sql`, `)})
      )`);
    }
    if (modelIds.length) {
      conds.push(sql`${products.id} in (
        select pf.product_id from product_fitments pf where pf.vehicle_model_id in (${sql.join(modelIds.map((id) => sql`${id}`), sql`, `)})
      )`);
    }
    if (mfrIds.length) conds.push(inArray(products.manufacturerId, mfrIds));
    return or(...conds)!;
  });
  const nameHits = sql.join(
    namePatterns.map((p) => sql`(case when ${products.name} like ${p} then 1 else 0 end)`),
    sql` + `,
  );

  return db
    .select({
      id: products.id,
      title: products.name,
      slug: products.slug,
      sku: products.sku,
      price: products.price,
      manufacturer: manufacturers.name,
      manufacturerLogo: manufacturerLogoSql,
      stockStatus: products.stockStatus,
      thumbnail: sql<string | null>`(select pi.url from product_images pi where pi.product_id = ${products.id} order by pi.sort_order limit 1)`,
    })
    .from(products)
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(
      and(
        eq(products.status, "active"),
        tenantVisibleSql(tenantId, seesAll),
        or(and(...tokenConds), eq(products.sku, query), matchOem),
      ),
    )
    .orderBy(
      sql`(${nameHits}) desc`,
      sql`case when ${products.name} like ${`${stemToken(tokens[0]!)}%`} then 0 else 1 end`,
      desc(products.stockQty),
      asc(products.name),
    )
    .limit(limit);
}
