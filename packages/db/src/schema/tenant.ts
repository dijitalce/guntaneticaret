import {
  boolean,
  char,
  index,
  int,
  json,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, timestamps } from "./common";

export const tenants = mysqlTable("tenants", {
  id,
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  visibilityMode: varchar("visibility_mode", { length: 32 }).notNull().default("ALL"),
  ...timestamps,
}, (t) => [
  uniqueIndex("tenants_slug_uidx").on(t.slug),
]);

export const tenantDomains = mysqlTable("tenant_domains", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  hostname: varchar("hostname", { length: 255 }).notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  ...timestamps,
}, (t) => [
  uniqueIndex("tenant_domains_hostname_uidx").on(t.hostname),
  index("tenant_domains_tenant_idx").on(t.tenantId),
]);

export const tenantSettings = mysqlTable("tenant_settings", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  siteName: varchar("site_name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  logoDarkUrl: text("logo_dark_url"),
  faviconUrl: text("favicon_url"),
  placeholderImageUrl: text("placeholder_image_url"),
  phone: varchar("phone", { length: 64 }),
  whatsapp: varchar("whatsapp", { length: 64 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  socialJson: json("social_json").$type<Record<string, string>>().default({}),
  themeTokens: json("theme_tokens").$type<Record<string, string>>().notNull().default({}),
  defaultMetaTitle: varchar("default_meta_title", { length: 255 }),
  defaultMetaDescription: text("default_meta_description"),
  ogImageUrl: text("og_image_url"),
  gaId: varchar("ga_id", { length: 64 }),
  gtmId: varchar("gtm_id", { length: 64 }),
  customScripts: text("custom_scripts"),
  headerHtml: text("header_html"),
  footerHtml: text("footer_html"),
  minOrderAmount: int("min_order_amount").notNull().default(0),
  paymentExpireHours: int("payment_expire_hours").notNull().default(72),
  seoTitleTemplate: varchar("seo_title_template", { length: 255 }).default("{page} | {siteName}"),
  seoContent: text("seo_content"),
  ...timestamps,
}, (t) => [
  uniqueIndex("tenant_settings_tenant_uidx").on(t.tenantId),
]);

export const tenantCatalogRules = mysqlTable("tenant_catalog_rules", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 64 }).notNull(),
  targetId: char("target_id", { length: 36 }).notNull(),
  ...timestamps,
}, (t) => [
  index("tenant_catalog_rules_tenant_idx").on(t.tenantId),
  uniqueIndex("tenant_catalog_rules_uidx").on(t.tenantId, t.kind, t.targetId),
]);

export const tenantBankAccounts = mysqlTable("tenant_bank_accounts", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  accountHolder: varchar("account_holder", { length: 255 }).notNull(),
  iban: varchar("iban", { length: 64 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("tenant_bank_accounts_tenant_idx").on(t.tenantId),
]);
