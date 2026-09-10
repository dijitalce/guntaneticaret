import {
  char,
  decimal,
  index,
  int,
  json,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, timestamps } from "./common";
import { products } from "./catalog";
import { tenants } from "./tenant";

export const customers = mysqlTable("customers", {
  id,
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 128 }).notNull(),
  lastName: varchar("last_name", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 64 }),
  invoiceType: varchar("invoice_type", { length: 32 }).notNull().default("individual"),
  companyName: varchar("company_name", { length: 255 }),
  taxOffice: varchar("tax_office", { length: 128 }),
  taxNumber: varchar("tax_number", { length: 64 }),
  nationalId: varchar("national_id", { length: 32 }),
  ...timestamps,
}, (t) => [
  uniqueIndex("customers_email_uidx").on(t.email),
]);

export const customerSessions = mysqlTable("customer_sessions", {
  id,
  customerId: char("customer_id", { length: 36 }).notNull().references(() => customers.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull(),
  expiresAt: varchar("expires_at", { length: 64 }).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("customer_sessions_token_uidx").on(t.tokenHash),
  index("customer_sessions_customer_idx").on(t.customerId),
]);

export const customerAddresses = mysqlTable("customer_addresses", {
  id,
  customerId: char("customer_id", { length: 36 }).notNull().references(() => customers.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 128 }).notNull().default("Adres"),
  kind: varchar("kind", { length: 32 }).notNull().default("shipping"),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  city: varchar("city", { length: 128 }).notNull(),
  district: varchar("district", { length: 128 }).notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  postalCode: varchar("postal_code", { length: 32 }),
  isDefault: int("is_default").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("customer_addresses_customer_idx").on(t.customerId),
]);

export const customerVehicles = mysqlTable("customer_vehicles", {
  id,
  customerId: char("customer_id", { length: 36 }).notNull().references(() => customers.id, { onDelete: "cascade" }),
  brandId: char("brand_id", { length: 36 }).notNull(),
  modelId: char("model_id", { length: 36 }).notNull(),
  generationId: char("generation_id", { length: 36 }),
  engineId: char("engine_id", { length: 36 }),
  year: int("year"),
  label: varchar("label", { length: 255 }),
  isSelected: int("is_selected").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("customer_vehicles_customer_idx").on(t.customerId),
]);

export const carts = mysqlTable("carts", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: char("customer_id", { length: 36 }).references(() => customers.id, { onDelete: "set null" }),
  sessionId: varchar("session_id", { length: 128 }),
  ...timestamps,
}, (t) => [
  index("carts_tenant_customer_idx").on(t.tenantId, t.customerId),
  index("carts_tenant_session_idx").on(t.tenantId, t.sessionId),
]);

export const cartItems = mysqlTable("cart_items", {
  id,
  cartId: char("cart_id", { length: 36 }).notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: char("product_id", { length: 36 }).notNull().references(() => products.id),
  qty: int("qty").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("cart_items_cart_product_uidx").on(t.cartId, t.productId),
  index("cart_items_product_idx").on(t.productId),
]);

export const wishlists = mysqlTable("wishlists", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: char("customer_id", { length: 36 }).references(() => customers.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 128 }),
  productId: char("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  ...timestamps,
}, (t) => [
  index("wishlists_tenant_customer_idx").on(t.tenantId, t.customerId),
]);

export const coupons = mysqlTable("coupons", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 64 }).notNull(),
  type: varchar("type", { length: 32 }).notNull().default("percent"),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  minSubtotal: decimal("min_subtotal", { precision: 12, scale: 2 }),
  isActive: int("is_active").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("coupons_tenant_code_uidx").on(t.tenantId, t.code),
]);

export const orders = mysqlTable("orders", {
  id,
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  customerId: char("customer_id", { length: 36 }).references(() => customers.id),
  orderNo: varchar("order_no", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending_payment"),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  shippingAddress: json("shipping_address").$type<Record<string, string>>().notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  shippingTotal: decimal("shipping_total", { precision: 12, scale: 2 }).notNull().default("0"),
  discountTotal: decimal("discount_total", { precision: 12, scale: 2 }).notNull().default("0"),
  grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),
  couponCode: varchar("coupon_code", { length: 64 }),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  uniqueIndex("orders_order_no_uidx").on(t.orderNo),
  index("orders_tenant_idx").on(t.tenantId),
  index("orders_customer_idx").on(t.customerId),
  index("orders_status_idx").on(t.status),
]);

export const orderItems = mysqlTable("order_items", {
  id,
  orderId: char("order_id", { length: 36 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: char("product_id", { length: 36 }).notNull().references(() => products.id),
  name: varchar("name", { length: 512 }).notNull(),
  sku: varchar("sku", { length: 191 }).notNull(),
  imageUrl: text("image_url"),
  qty: int("qty").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  ...timestamps,
}, (t) => [
  index("order_items_order_idx").on(t.orderId),
  index("order_items_product_idx").on(t.productId),
]);

export const payments = mysqlTable("payments", {
  id,
  orderId: char("order_id", { length: 36 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  method: varchar("method", { length: 32 }).notNull().default("bank_transfer"),
  status: varchar("status", { length: 32 }).notNull().default("awaiting"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  providerRef: varchar("provider_ref", { length: 255 }),
  ...timestamps,
}, (t) => [
  index("payments_order_idx").on(t.orderId),
  index("payments_tenant_idx").on(t.tenantId),
]);

export const shipments = mysqlTable("shipments", {
  id,
  orderId: char("order_id", { length: 36 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
  carrier: varchar("carrier", { length: 128 }),
  trackingNo: varchar("tracking_no", { length: 128 }),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  ...timestamps,
}, (t) => [
  index("shipments_order_idx").on(t.orderId),
]);

export const returnRequests = mysqlTable("return_requests", {
  id,
  orderId: char("order_id", { length: 36 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
  tenantId: char("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  ...timestamps,
}, (t) => [
  index("return_requests_order_idx").on(t.orderId),
]);
