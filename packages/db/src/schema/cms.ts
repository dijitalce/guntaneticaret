import {
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
import { tenants } from "./tenant";

export const pages = mysqlTable("pages", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  body: text("body").notNull().default(""),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  isPublished: int("is_published").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("pages_tenant_slug_uidx").on(t.tenantId, t.slug),
]);

export const menus = mysqlTable("menus", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("menus_tenant_key_uidx").on(t.tenantId, t.key),
]);

export const menuItems = mysqlTable("menu_items", {
  id,
  menuId: char("menu_id", { length: 36 }).notNull().references(() => menus.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(),
  href: varchar("href", { length: 512 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("menu_items_menu_idx").on(t.menuId),
]);

export const banners = mysqlTable("banners", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  imageUrl: text("image_url").notNull(),
  href: varchar("href", { length: 512 }),
  placement: varchar("placement", { length: 64 }).notNull().default("home"),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: int("is_active").notNull().default(1),
  ...timestamps,
}, (t) => [
  index("banners_tenant_idx").on(t.tenantId),
]);

export const homepageSections = mysqlTable("homepage_sections", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }),
  config: json("config").$type<Record<string, unknown>>().default({}),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: int("is_active").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("homepage_sections_tenant_key_uidx").on(t.tenantId, t.key),
]);

export const redirects = mysqlTable("redirects", {
  id,
  tenantId: char("tenant_id", { length: 36 }).references(() => tenants.id, { onDelete: "cascade" }),
  oldPath: varchar("old_path", { length: 512 }).notNull(),
  newPath: varchar("new_path", { length: 512 }).notNull(),
  statusCode: int("status_code").notNull().default(301),
  ...timestamps,
}, (t) => [
  index("redirects_old_path_idx").on(t.oldPath),
]);

export const faqs = mysqlTable("faqs", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  ...timestamps,
});

export const blogPosts = mysqlTable("blog_posts", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull(),
  excerpt: text("excerpt"),
  body: text("body").notNull().default(""),
  isPublished: int("is_published").notNull().default(0),
  ...timestamps,
}, (t) => [
  uniqueIndex("blog_posts_tenant_slug_uidx").on(t.tenantId, t.slug),
]);
