import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";
import { products } from "./catalog";
import { tenants } from "./tenant";

export const customers = pgTable("customers", {
  id,
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  ...timestamps,
}, (t) => [
  uniqueIndex("customers_email_uidx").on(t.email),
]);

export const customerSessions = pgTable("customer_sessions", {
  id,
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex("customer_sessions_token_uidx").on(t.tokenHash),
  index("customer_sessions_customer_idx").on(t.customerId),
]);

export const customerAddresses = pgTable("customer_addresses", {
  id,
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Adres"),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  postalCode: text("postal_code"),
  isDefault: integer("is_default").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("customer_addresses_customer_idx").on(t.customerId),
]);

export const customerVehicles = pgTable("customer_vehicles", {
  id,
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull(),
  modelId: uuid("model_id").notNull(),
  generationId: uuid("generation_id"),
  engineId: uuid("engine_id"),
  year: integer("year"),
  label: text("label"),
  isSelected: integer("is_selected").notNull().default(0),
  ...timestamps,
}, (t) => [
  index("customer_vehicles_customer_idx").on(t.customerId),
]);

export const carts = pgTable("carts", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  ...timestamps,
}, (t) => [
  index("carts_tenant_customer_idx").on(t.tenantId, t.customerId),
  index("carts_tenant_session_idx").on(t.tenantId, t.sessionId),
]);

export const cartItems = pgTable("cart_items", {
  id,
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  qty: integer("qty").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("cart_items_cart_product_uidx").on(t.cartId, t.productId),
]);

export const wishlists = pgTable("wishlists", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  sessionId: text("session_id"),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  ...timestamps,
}, (t) => [
  index("wishlists_tenant_customer_idx").on(t.tenantId, t.customerId),
]);

export const coupons = pgTable("coupons", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  type: text("type").notNull().default("percent"),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  minSubtotal: numeric("min_subtotal", { precision: 12, scale: 2 }),
  isActive: integer("is_active").notNull().default(1),
  ...timestamps,
}, (t) => [
  uniqueIndex("coupons_tenant_code_uidx").on(t.tenantId, t.code),
]);

export const orders = pgTable("orders", {
  id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  customerId: uuid("customer_id").references(() => customers.id),
  orderNo: text("order_no").notNull(),
  status: text("status").notNull().default("pending_payment"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  fullName: text("full_name").notNull(),
  shippingAddress: jsonb("shipping_address").$type<Record<string, string>>().notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  shippingTotal: numeric("shipping_total", { precision: 12, scale: 2 }).notNull().default("0"),
  discountTotal: numeric("discount_total", { precision: 12, scale: 2 }).notNull().default("0"),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
  couponCode: text("coupon_code"),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  uniqueIndex("orders_order_no_uidx").on(t.orderNo),
  index("orders_tenant_idx").on(t.tenantId),
  index("orders_customer_idx").on(t.customerId),
  index("orders_status_idx").on(t.status),
]);

export const orderItems = pgTable("order_items", {
  id,
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  imageUrl: text("image_url"),
  qty: integer("qty").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  ...timestamps,
}, (t) => [
  index("order_items_order_idx").on(t.orderId),
]);

export const payments = pgTable("payments", {
  id,
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  method: text("method").notNull().default("bank_transfer"),
  status: text("status").notNull().default("awaiting"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  providerRef: text("provider_ref"),
  ...timestamps,
}, (t) => [
  index("payments_order_idx").on(t.orderId),
  index("payments_tenant_idx").on(t.tenantId),
]);

export const shipments = pgTable("shipments", {
  id,
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  carrier: text("carrier"),
  trackingNo: text("tracking_no"),
  status: text("status").notNull().default("pending"),
  ...timestamps,
}, (t) => [
  index("shipments_order_idx").on(t.orderId),
]);

export const returnRequests = pgTable("return_requests", {
  id,
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  ...timestamps,
}, (t) => [
  index("return_requests_order_idx").on(t.orderId),
]);
