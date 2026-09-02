import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";

export const tenants = pgTable("tenants", {
  id,
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: text("status").notNull().default("draft"),
  visibilityMode: text("visibility_mode").notNull().default("ALL"),
  ...timestamps,
}, (t) => [
  uniqueIndex("tenants_slug_uidx").on(t.slug),
]);

export const tenantDomains = pgTable("tenant_domains", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  hostname: text("hostname").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  ...timestamps,
}, (t) => [
  uniqueIndex("tenant_domains_hostname_uidx").on(t.hostname),
  index("tenant_domains_tenant_idx").on(t.tenantId),
]);

export const tenantSettings = pgTable("tenant_settings", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  siteName: text("site_name").notNull(),
  logoUrl: text("logo_url"),
  logoDarkUrl: text("logo_dark_url"),
  faviconUrl: text("favicon_url"),
  placeholderImageUrl: text("placeholder_image_url"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  address: text("address"),
  socialJson: jsonb("social_json").$type<Record<string, string>>().default({}),
  themeTokens: jsonb("theme_tokens").$type<Record<string, string>>().notNull().default({}),
  defaultMetaTitle: text("default_meta_title"),
  defaultMetaDescription: text("default_meta_description"),
  ogImageUrl: text("og_image_url"),
  gaId: text("ga_id"),
  gtmId: text("gtm_id"),
  customScripts: text("custom_scripts"),
  headerHtml: text("header_html"),
  footerHtml: text("footer_html"),
  minOrderAmount: integer("min_order_amount").notNull().default(0),
  paymentExpireHours: integer("payment_expire_hours").notNull().default(72),
  seoTitleTemplate: text("seo_title_template").default("{page} | {siteName}"),
  seoContent: text("seo_content"),
  ...timestamps,
}, (t) => [
  uniqueIndex("tenant_settings_tenant_uidx").on(t.tenantId),
]);

export const tenantCatalogRules = pgTable("tenant_catalog_rules", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  targetId: uuid("target_id").notNull(),
  ...timestamps,
}, (t) => [
  index("tenant_catalog_rules_tenant_idx").on(t.tenantId),
  uniqueIndex("tenant_catalog_rules_uidx").on(t.tenantId, t.kind, t.targetId),
]);

export const tenantBankAccounts = pgTable("tenant_bank_accounts", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountHolder: text("account_holder").notNull(),
  iban: text("iban").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("tenant_bank_accounts_tenant_idx").on(t.tenantId),
]);
