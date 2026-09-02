import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";
import { tenants } from "./tenant";

export const vehicleBrands = pgTable("vehicle_brands", {
  id,
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  seoContent: text("seo_content"),
  ...timestamps,
}, (t) => [
  uniqueIndex("vehicle_brands_slug_uidx").on(t.slug),
]);

export const brandGroups = pgTable("brand_groups", {
  id,
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("brand_groups_slug_uidx").on(t.slug),
]);

export const brandGroupMembers = pgTable("brand_group_members", {
  groupId: uuid("group_id").notNull().references(() => brandGroups.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => vehicleBrands.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.groupId, t.brandId] }),
]);

export const vehicleModels = pgTable("vehicle_models", {
  id,
  brandId: uuid("brand_id").notNull().references(() => vehicleBrands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  seoContent: text("seo_content"),
  ...timestamps,
}, (t) => [
  uniqueIndex("vehicle_models_brand_slug_uidx").on(t.brandId, t.slug),
  index("vehicle_models_brand_idx").on(t.brandId),
]);

export const vehicleGenerations = pgTable("vehicle_generations", {
  id,
  modelId: uuid("model_id").notNull().references(() => vehicleModels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  bodyCode: text("body_code"),
  yearFrom: integer("year_from"),
  yearTo: integer("year_to"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (t) => [
  index("vehicle_generations_model_idx").on(t.modelId),
]);

export const vehicleEngines = pgTable("vehicle_engines", {
  id,
  generationId: uuid("generation_id").notNull().references(() => vehicleGenerations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  fuel: text("fuel"),
  displacementCc: integer("displacement_cc"),
  powerHp: integer("power_hp"),
  code: text("code"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (t) => [
  index("vehicle_engines_generation_idx").on(t.generationId),
]);

export const categories = pgTable("categories", {
  id,
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  path: text("path").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  seoContent: text("seo_content"),
  ...timestamps,
}, (t) => [
  uniqueIndex("categories_path_uidx").on(t.path),
  index("categories_parent_idx").on(t.parentId),
]);

export const manufacturers = pgTable("manufacturers", {
  id,
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (t) => [
  uniqueIndex("manufacturers_slug_uidx").on(t.slug),
]);

export const suppliers = pgTable("suppliers", {
  id,
  name: text("name").notNull(),
  code: text("code").notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("suppliers_code_uidx").on(t.code),
]);

export const products = pgTable("products", {
  id,
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  manufacturerId: uuid("manufacturer_id").references(() => manufacturers.id),
  sku: text("sku").notNull(),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  barcode: text("barcode"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("20"),
  stockQty: integer("stock_qty").notNull().default(0),
  reservedQty: integer("reserved_qty").notNull().default(0),
  stockStatus: text("stock_status").notNull().default("in_stock"),
  status: text("status").notNull().default("active"),
  contentHash: text("content_hash"),
  source: text("source").notNull().default("manual"),
  publishedAt: text("published_at"),
  ...timestamps,
}, (t) => [
  uniqueIndex("products_supplier_external_uidx").on(t.supplierId, t.externalId),
  uniqueIndex("products_slug_uidx").on(t.slug),
  index("products_status_idx").on(t.status),
  index("products_sku_idx").on(t.sku),
  index("products_barcode_idx").on(t.barcode),
]);

export const productImages = pgTable("product_images", {
  id,
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  s3Key: text("s3_key").notNull(),
  url: text("url").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("product_images_product_idx").on(t.productId),
]);

export const productOems = pgTable("product_oems", {
  id,
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  raw: text("raw").notNull(),
  normalized: text("normalized").notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("product_oems_product_norm_uidx").on(t.productId, t.normalized),
  index("product_oems_normalized_idx").on(t.normalized),
]);

export const productCategories = pgTable("product_categories", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.productId, t.categoryId] }),
]);

export const productFitments = pgTable("product_fitments", {
  id,
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  vehicleBrandId: uuid("vehicle_brand_id").notNull().references(() => vehicleBrands.id),
  vehicleModelId: uuid("vehicle_model_id").notNull().references(() => vehicleModels.id),
  vehicleGenerationId: uuid("vehicle_generation_id").references(() => vehicleGenerations.id),
  vehicleEngineId: uuid("vehicle_engine_id").references(() => vehicleEngines.id),
  yearFrom: integer("year_from"),
  yearTo: integer("year_to"),
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
  index("product_fitments_product_idx").on(t.productId),
]);

export const tenantCatalogIndex = pgTable("tenant_catalog_index", {
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.productId] }),
  index("tenant_catalog_index_product_idx").on(t.productId),
]);

export const tenantVisibleBrands = pgTable("tenant_visible_brands", {
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => vehicleBrands.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.brandId] }),
]);

export const tenantProductOverrides = pgTable("tenant_product_overrides", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 12, scale: 2 }),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  minQty: integer("min_qty"),
  isHidden: boolean("is_hidden").notNull().default(false),
  ...timestamps,
}, (t) => [
  uniqueIndex("tenant_product_overrides_uidx").on(t.tenantId, t.productId),
]);
