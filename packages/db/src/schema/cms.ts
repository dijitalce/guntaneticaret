import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";
import { tenants } from "./tenant";

export const pages = pgTable("pages", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  body: text("body").notNull().default(""),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  isPublished: integer("is_published").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("pages_tenant_slug_uidx").on(t.tenantId, t.slug),
]);

export const menus = pgTable("menus", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("menus_tenant_key_uidx").on(t.tenantId, t.key),
]);

export const menuItems = pgTable("menu_items", {
  id,
  menuId: uuid("menu_id").notNull().references(() => menus.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("menu_items_menu_idx").on(t.menuId),
]);

export const banners = pgTable("banners", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  href: text("href"),
  placement: text("placement").notNull().default("home"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  ...timestamps,
}, (t) => [
  index("banners_tenant_idx").on(t.tenantId),
]);

export const homepageSections = pgTable("homepage_sections", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  title: text("title"),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("homepage_sections_tenant_key_uidx").on(t.tenantId, t.key),
]);

export const redirects = pgTable("redirects", {
  id,
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  oldPath: text("old_path").notNull(),
  newPath: text("new_path").notNull(),
  statusCode: integer("status_code").notNull().default(301),
  ...timestamps,
}, (t) => [
  index("redirects_old_path_idx").on(t.oldPath),
]);

export const faqs = pgTable("faqs", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const blogPosts = pgTable("blog_posts", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  excerpt: text("excerpt"),
  body: text("body").notNull().default(""),
  isPublished: integer("is_published").notNull().default(0),
  ...timestamps,
}, (t) => [
  uniqueIndex("blog_posts_tenant_slug_uidx").on(t.tenantId, t.slug),
]);
