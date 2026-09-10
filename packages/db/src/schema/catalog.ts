import { desc } from "drizzle-orm";
import {
  boolean,
  char,
  decimal,
  index,
  int,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, timestamps } from "./common";
import { tenants } from "./tenant";

export const vehicleBrands = mysqlTable("vehicle_brands", {
  id,
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  seoContent: text("seo_content"),
  ...timestamps,
}, (t) => [
  uniqueIndex("vehicle_brands_slug_uidx").on(t.slug),
]);

export const brandGroups = mysqlTable("brand_groups", {
  id,
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("brand_groups_slug_uidx").on(t.slug),
]);

export const brandGroupMembers = mysqlTable("brand_group_members", {
  groupId: char("group_id", { length: 36 }).notNull().references(() => brandGroups.id, { onDelete: "cascade" }),
  brandId: char("brand_id", { length: 36 }).notNull().references(() => vehicleBrands.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.groupId, t.brandId] }),
]);

export const vehicleModels = mysqlTable("vehicle_models", {
  id,
  brandId: char("brand_id", { length: 36 }).notNull().references(() => vehicleBrands.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  seoContent: text("seo_content"),
  ...timestamps,
}, (t) => [
  uniqueIndex("vehicle_models_brand_slug_uidx").on(t.brandId, t.slug),
  index("vehicle_models_brand_idx").on(t.brandId),
]);

export const vehicleGenerations = mysqlTable("vehicle_generations", {
  id,
  modelId: char("model_id", { length: 36 }).notNull().references(() => vehicleModels.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  bodyCode: varchar("body_code", { length: 64 }),
  yearFrom: int("year_from"),
  yearTo: int("year_to"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (t) => [
  index("vehicle_generations_model_idx").on(t.modelId),
]);

export const vehicleEngines = mysqlTable("vehicle_engines", {
  id,
  generationId: char("generation_id", { length: 36 }).notNull().references(() => vehicleGenerations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  fuel: varchar("fuel", { length: 64 }),
  displacementCc: int("displacement_cc"),
  powerHp: int("power_hp"),
  code: varchar("code", { length: 64 }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (t) => [
  index("vehicle_engines_generation_idx").on(t.generationId),
]);

export const categories = mysqlTable("categories", {
  id,
  parentId: char("parent_id", { length: 36 }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  path: varchar("path", { length: 512 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  seoContent: text("seo_content"),
  ...timestamps,
}, (t) => [
  uniqueIndex("categories_path_uidx").on(t.path),
  index("categories_parent_idx").on(t.parentId),
]);

export const manufacturers = mysqlTable("manufacturers", {
  id,
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (t) => [
  uniqueIndex("manufacturers_slug_uidx").on(t.slug),
]);

export const suppliers = mysqlTable("suppliers", {
  id,
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("suppliers_code_uidx").on(t.code),
]);

export const products = mysqlTable("products", {
  id,
  supplierId: char("supplier_id", { length: 36 }).notNull().references(() => suppliers.id),
  manufacturerId: char("manufacturer_id", { length: 36 }).references(() => manufacturers.id),
  sku: varchar("sku", { length: 191 }).notNull(),
  externalId: varchar("external_id", { length: 191 }).notNull(),
  name: varchar("name", { length: 512 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  description: text("description"),
  barcode: varchar("barcode", { length: 64 }),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 12, scale: 2 }),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull().default("20"),
  stockQty: int("stock_qty").notNull().default(0),
  reservedQty: int("reserved_qty").notNull().default(0),
  stockStatus: varchar("stock_status", { length: 32 }).notNull().default("in_stock"),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  contentHash: varchar("content_hash", { length: 64 }),
  source: varchar("source", { length: 32 }).notNull().default("manual"),
  publishedAt: varchar("published_at", { length: 64 }),
  ...timestamps,
}, (t) => [
  uniqueIndex("products_supplier_external_uidx").on(t.supplierId, t.externalId),
  uniqueIndex("products_slug_uidx").on(t.slug),
  index("products_status_idx").on(t.status),
  index("products_sku_idx").on(t.sku),
  index("products_active_stock_idx").on(t.status, desc(t.stockQty), desc(t.updatedAt)),
  index("products_manufacturer_active_idx").on(t.status, t.manufacturerId),
  index("products_price_active_idx").on(t.status, t.price),
  index("products_name_prefix_idx").on(t.name),
  index("products_sku_prefix_idx").on(t.sku),
]);

export const productImages = mysqlTable("product_images", {
  id,
  productId: char("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  s3Key: varchar("s3_key", { length: 512 }).notNull(),
  url: text("url").notNull(),
  alt: varchar("alt", { length: 255 }),
  sortOrder: int("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("product_images_product_idx").on(t.productId, t.sortOrder),
]);

export const productOems = mysqlTable("product_oems", {
  id,
  productId: char("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  raw: varchar("raw", { length: 191 }).notNull(),
  normalized: varchar("normalized", { length: 191 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("product_oems_product_norm_uidx").on(t.productId, t.normalized),
  index("product_oems_normalized_idx").on(t.normalized),
]);

export const productCategories = mysqlTable("product_categories", {
  productId: char("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  categoryId: char("category_id", { length: 36 }).notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.productId, t.categoryId] }),
  index("product_categories_category_idx").on(t.categoryId),
]);

export const productFitments = mysqlTable("product_fitments", {
  id,
  productId: char("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  vehicleBrandId: char("vehicle_brand_id", { length: 36 }).notNull().references(() => vehicleBrands.id),
  vehicleModelId: char("vehicle_model_id", { length: 36 }).notNull().references(() => vehicleModels.id),
  vehicleGenerationId: char("vehicle_generation_id", { length: 36 }).references(() => vehicleGenerations.id),
  vehicleEngineId: char("vehicle_engine_id", { length: 36 }).references(() => vehicleEngines.id),
  yearFrom: int("year_from"),
  yearTo: int("year_to"),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  uniqueIndex("product_fitments_uidx").on(
    t.productId,
    t.vehicleModelId,
    t.vehicleGenerationId,
    t.vehicleEngineId,
  ),
  index("product_fitments_brand_model_idx").on(t.vehicleBrandId, t.vehicleModelId),
  index("product_fitments_brand_product_idx").on(t.vehicleBrandId, t.productId),
  index("product_fitments_model_product_idx").on(t.vehicleModelId, t.productId),
  index("product_fitments_engine_idx").on(t.vehicleEngineId),
]);

export const tenantCatalogIndex = mysqlTable("tenant_catalog_index", {
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: char("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.productId] }),
  index("tenant_catalog_index_product_idx").on(t.productId),
]);

export const tenantVisibleBrands = mysqlTable("tenant_visible_brands", {
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  brandId: char("brand_id", { length: 36 }).notNull().references(() => vehicleBrands.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.brandId] }),
]);

export const tenantProductOverrides = mysqlTable("tenant_product_overrides", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: char("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  price: decimal("price", { precision: 12, scale: 2 }),
  compareAtPrice: decimal("compare_at_price", { precision: 12, scale: 2 }),
  minQty: int("min_qty"),
  isHidden: boolean("is_hidden").notNull().default(false),
  ...timestamps,
}, (t) => [
  uniqueIndex("tenant_product_overrides_uidx").on(t.tenantId, t.productId),
]);
