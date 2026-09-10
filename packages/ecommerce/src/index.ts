import { and, eq, inArray, sql } from "drizzle-orm";
import {
  cartItems,
  carts,
  db,
  newId,
  orderItems,
  orders,
  payments,
  productImages,
  products,
  shipments,
  tenantBankAccounts,
  tenantCatalogIndex,
  tenantSeesAllCatalog,
} from "@guntan/db";
import { getPaymentProvider } from "@guntan/payments";
import {
  FREE_SHIPPING_MIN,
  getShippingProvider,
  remainingForFreeShipping,
  shippingAmountForSubtotal,
} from "@guntan/shipping";
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, type OrderStatus } from "@guntan/types";

export function availableStock(stockQty: number, reservedQty: number): number {
  return Math.max(0, stockQty - reservedQty);
}

export function discountPercent(price: string, compareAt?: string | null): number | null {
  if (!compareAt) return null;
  const p = Number(price);
  const c = Number(compareAt);
  if (!c || c <= p) return null;
  return Math.round(((c - p) / c) * 100);
}

export async function getOrCreateCart(tenantId: string, customerId?: string | null, sessionId?: string | null) {
  if (customerId) {
    const [existing] = await db
      .select()
      .from(carts)
      .where(and(eq(carts.tenantId, tenantId), eq(carts.customerId, customerId)))
      .limit(1);
    if (existing) return existing;
  }
  if (sessionId) {
    const [existing] = await db
      .select()
      .from(carts)
      .where(and(eq(carts.tenantId, tenantId), eq(carts.sessionId, sessionId)))
      .limit(1);
    if (existing) {
      if (customerId && !existing.customerId) {
        await db.update(carts).set({ customerId, updatedAt: new Date() }).where(eq(carts.id, existing.id));
        return { ...existing, customerId };
      }
      return existing;
    }
  }
  const id = newId();
  await db.insert(carts).values({
    id,
    tenantId,
    customerId: customerId ?? null,
    sessionId: sessionId ?? null,
  });
  const [created] = await db.select().from(carts).where(eq(carts.id, id)).limit(1);
  return created!;
}

/** Misafir sepetini üye sepetine bağlar / birleştirir. */
export async function attachCartToCustomer(tenantId: string, customerId: string, sessionId?: string | null) {
  if (!sessionId) return getOrCreateCart(tenantId, customerId, null);

  const [sessionCart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.tenantId, tenantId), eq(carts.sessionId, sessionId)))
    .limit(1);

  const [customerCart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.tenantId, tenantId), eq(carts.customerId, customerId)))
    .limit(1);

  if (!sessionCart) {
    return customerCart ?? getOrCreateCart(tenantId, customerId, sessionId);
  }

  if (!customerCart || customerCart.id === sessionCart.id) {
    if (!sessionCart.customerId) {
      await db.update(carts).set({ customerId, updatedAt: new Date() }).where(eq(carts.id, sessionCart.id));
    }
    return { ...sessionCart, customerId };
  }

  const sessionItems = await db.select().from(cartItems).where(eq(cartItems.cartId, sessionCart.id));
  for (const item of sessionItems) {
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, customerCart.id), eq(cartItems.productId, item.productId)))
      .limit(1);
    if (existing) {
      await db.update(cartItems).set({ qty: existing.qty + item.qty }).where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ cartId: customerCart.id, productId: item.productId, qty: item.qty });
    }
  }
  await db.delete(cartItems).where(eq(cartItems.cartId, sessionCart.id));
  await db.delete(carts).where(eq(carts.id, sessionCart.id));
  return customerCart;
}

export async function addToCart(cartId: string, tenantId: string, productId: string, qty = 1) {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || product.status !== "active") throw new Error("Ürün bulunamadı.");
  const seesAll = await tenantSeesAllCatalog(tenantId);
  if (!seesAll) {
    const [visible] = await db
      .select({ productId: tenantCatalogIndex.productId })
      .from(tenantCatalogIndex)
      .where(and(eq(tenantCatalogIndex.tenantId, tenantId), eq(tenantCatalogIndex.productId, productId)))
      .limit(1);
    if (!visible) throw new Error("Ürün bu sitede satılmıyor.");
  }
  if (availableStock(product.stockQty, product.reservedQty) < qty) throw new Error("Yetersiz stok.");

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    .limit(1);
  if (existing) {
    await db.update(cartItems).set({ qty: existing.qty + qty }).where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({ cartId, productId, qty });
  }
}

export async function removeCartItem(cartId: string, itemId: string) {
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
}

export async function updateCartItemQty(cartId: string, itemId: string, qty: number) {
  const nextQty = Math.floor(Number(qty));
  if (!Number.isFinite(nextQty) || nextQty <= 0) {
    await removeCartItem(cartId, itemId);
    return;
  }

  const [item] = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      stockQty: products.stockQty,
      reservedQty: products.reservedQty,
      status: products.status,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
    .limit(1);
  if (!item) throw new Error("Sepet kalemi bulunamadı.");
  if (item.status !== "active") throw new Error("Ürün satışta değil.");
  if (availableStock(item.stockQty, item.reservedQty) < nextQty) throw new Error("Yetersiz stok.");

  await db.update(cartItems).set({ qty: nextQty }).where(eq(cartItems.id, item.id));
}

async function findCartId(tenantId: string, customerId?: string | null, sessionId?: string | null) {
  if (customerId) {
    const [byCustomer] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.tenantId, tenantId), eq(carts.customerId, customerId)))
      .limit(1);
    if (byCustomer) return byCustomer.id;
  }
  if (sessionId) {
    const [bySession] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.tenantId, tenantId), eq(carts.sessionId, sessionId)))
      .limit(1);
    if (bySession) return bySession.id;
  }
  return null;
}

export async function cartQty(tenantId: string, sessionId?: string | null, customerId?: string | null) {
  const cartId = await findCartId(tenantId, customerId, sessionId);
  if (!cartId) return 0;
  const [row] = await db
    .select({ n: sql<number>`coalesce(sum(${cartItems.qty}), 0)` })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  return Number(row?.n ?? 0);
}

export async function getCartSummary(tenantId: string, sessionId?: string | null, customerId?: string | null) {
  const empty = {
    qty: 0,
    subtotal: 0,
    shippingAmount: shippingAmountForSubtotal(0),
    freeShippingMin: FREE_SHIPPING_MIN,
    remainingForFreeShipping: remainingForFreeShipping(0),
    freeShippingUnlocked: false,
    items: [] as Array<{
      id: string;
      name: string;
      slug: string;
      sku: string;
      qty: number;
      price: string;
      imageUrl: string | null;
    }>,
  };

  const cartId = await findCartId(tenantId, customerId, sessionId);
  if (!cartId) return empty;

  const view = await getCartView(cartId);
  const qty = view.items.reduce((sum, i) => sum + i.qty, 0);
  const shippingAmount = shippingAmountForSubtotal(view.subtotal);
  const remaining = remainingForFreeShipping(view.subtotal);
  return {
    qty,
    subtotal: view.subtotal,
    shippingAmount,
    freeShippingMin: FREE_SHIPPING_MIN,
    remainingForFreeShipping: remaining,
    freeShippingUnlocked: remaining <= 0 && view.subtotal > 0,
    items: view.items.map((i) => ({
      id: i.id,
      name: i.name,
      slug: i.slug,
      sku: i.sku,
      qty: i.qty,
      price: i.price,
      imageUrl: i.imageUrl,
    })),
  };
}

export async function getCartView(cartId: string) {
  const items = await db
    .select({
      id: cartItems.id,
      qty: cartItems.qty,
      productId: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      stockQty: products.stockQty,
      reservedQty: products.reservedQty,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId));

  const ids = items.map((i) => i.productId);
  const images = ids.length
    ? await db.select().from(productImages).where(inArray(productImages.productId, ids))
    : [];
  const img = new Map(images.map((i) => [i.productId, i.url]));
  const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
  return {
    items: items.map((i) => ({ ...i, imageUrl: img.get(i.productId) ?? null })),
    subtotal,
  };
}

function nextOrderNo(): string {
  return `GNT-${Date.now().toString(36).toUpperCase()}`;
}

export type CheckoutInvoiceType = "individual" | "corporate";

export type CheckoutAddressInput = {
  city: string;
  district: string;
  line1: string;
  postalCode?: string;
};

export async function checkout(input: {
  tenantId: string;
  cartId: string;
  customerId?: string | null;
  email: string;
  phone: string;
  fullName: string;
  invoiceType: CheckoutInvoiceType;
  companyName?: string;
  taxOffice?: string;
  taxNumber?: string;
  nationalId?: string;
  billing: CheckoutAddressInput;
  shipping: CheckoutAddressInput & { fullName?: string; phone?: string };
  shipDifferent: boolean;
  notes?: string;
  acceptMarketing?: boolean;
}) {
  const view = await getCartView(input.cartId);
  if (view.items.length === 0) throw new Error("Sepet boş.");
  if (!input.billing.city || !input.billing.district || !input.billing.line1) {
    throw new Error("Fatura adresi eksik.");
  }
  if (!input.shipping.city || !input.shipping.district || !input.shipping.line1) {
    throw new Error("Teslimat adresi eksik.");
  }
  if (input.invoiceType === "corporate") {
    if (!input.companyName?.trim() || !input.taxOffice?.trim() || !input.taxNumber?.trim()) {
      throw new Error("Kurumsal fatura bilgileri eksik.");
    }
  }

  for (const item of view.items) {
    if (availableStock(item.stockQty, item.reservedQty) < item.qty) {
      throw new Error(`${item.name} için yetersiz stok.`);
    }
  }

  const quotes = await getShippingProvider().quote({ subtotal: view.subtotal, city: input.shipping.city });
  const shipping = Number(quotes[0]?.amount ?? 0);
  const grand = view.subtotal + shipping;
  const orderNo = nextOrderNo();

  const order = {
    id: newId(),
    tenantId: input.tenantId,
    customerId: input.customerId ?? null,
    orderNo,
    status: ORDER_STATUS.PENDING_PAYMENT,
    email: input.email,
    phone: input.phone,
    fullName: input.fullName,
    shippingAddress: {
      city: input.shipping.city,
      district: input.shipping.district,
      line1: input.shipping.line1,
      postalCode: input.shipping.postalCode ?? "",
      shipFullName: input.shipping.fullName ?? input.fullName,
      shipPhone: input.shipping.phone ?? input.phone,
      shipDifferent: input.shipDifferent ? "1" : "0",
      invoiceType: input.invoiceType,
      companyName: input.companyName ?? "",
      taxOffice: input.taxOffice ?? "",
      taxNumber: input.taxNumber ?? "",
      nationalId: input.nationalId ?? "",
      billingCity: input.billing.city,
      billingDistrict: input.billing.district,
      billingLine1: input.billing.line1,
      billingPostalCode: input.billing.postalCode ?? "",
      acceptMarketing: input.acceptMarketing ? "1" : "0",
    },
    subtotal: view.subtotal.toFixed(2),
    shippingTotal: shipping.toFixed(2),
    discountTotal: "0.00",
    grandTotal: grand.toFixed(2),
    notes: input.notes?.trim() || null,
  };
  await db.insert(orders).values(order);

  for (const item of view.items) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      imageUrl: item.imageUrl,
      qty: item.qty,
      unitPrice: item.price,
    });
    await db
      .update(products)
      .set({ reservedQty: sql`${products.reservedQty} + ${item.qty}` })
      .where(eq(products.id, item.productId));
  }

  await db.insert(payments).values({
    orderId: order.id,
    tenantId: input.tenantId,
    method: PAYMENT_METHOD.BANK_TRANSFER,
    status: PAYMENT_STATUS.AWAITING,
    amount: grand.toFixed(2),
    providerRef: orderNo,
  });

  const accounts = await db
    .select()
    .from(tenantBankAccounts)
    .where(and(eq(tenantBankAccounts.tenantId, input.tenantId), eq(tenantBankAccounts.isActive, true)));

  const intent = await getPaymentProvider().createPayment({
    orderNo,
    amount: grand.toFixed(2),
    bankAccounts: accounts.map((a) => ({ bankName: a.bankName, accountHolder: a.accountHolder, iban: a.iban })),
  });

  await db.delete(cartItems).where(eq(cartItems.cartId, input.cartId));
  const [savedOrder] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
  return { order: savedOrder!, intent };
}

export async function confirmBankTransfer(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== ORDER_STATUS.PENDING_PAYMENT) throw new Error("Sipariş onaylanamaz.");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    await db
      .update(products)
      .set({
        stockQty: sql`${products.stockQty} - ${item.qty}`,
        reservedQty: sql`greatest(${products.reservedQty} - ${item.qty}, 0)`,
      })
      .where(eq(products.id, item.productId));
  }
  await db.update(orders).set({ status: ORDER_STATUS.PAID }).where(eq(orders.id, orderId));
  await db.update(payments).set({ status: PAYMENT_STATUS.CONFIRMED }).where(eq(payments.orderId, orderId));
  return order;
}

export async function cancelOrder(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== ORDER_STATUS.PENDING_PAYMENT) throw new Error("Sipariş iptal edilemez.");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    await db
      .update(products)
      .set({ reservedQty: sql`greatest(${products.reservedQty} - ${item.qty}, 0)` })
      .where(eq(products.id, item.productId));
  }
  await db.update(orders).set({ status: ORDER_STATUS.CANCELLED }).where(eq(orders.id, orderId));
  await db.update(payments).set({ status: PAYMENT_STATUS.CANCELLED }).where(eq(payments.orderId, orderId));
}

export async function markOrderPreparing(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== ORDER_STATUS.PAID) throw new Error("Sipariş hazırlanamaz.");
  await db.update(orders).set({ status: ORDER_STATUS.PREPARING, updatedAt: new Date() }).where(eq(orders.id, orderId));
  return order;
}

export async function shipOrder(
  orderId: string,
  input: { carrier?: string; trackingNo?: string } = {},
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || (order.status !== ORDER_STATUS.PAID && order.status !== ORDER_STATUS.PREPARING)) {
    throw new Error("Sipariş kargolanamaz.");
  }
  const [existing] = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
  if (existing) {
    await db
      .update(shipments)
      .set({
        carrier: input.carrier?.trim() || existing.carrier,
        trackingNo: input.trackingNo?.trim() || existing.trackingNo,
        status: "shipped",
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, existing.id));
  } else {
    await db.insert(shipments).values({
      orderId,
      carrier: input.carrier?.trim() || null,
      trackingNo: input.trackingNo?.trim() || null,
      status: "shipped",
    });
  }
  await db.update(orders).set({ status: ORDER_STATUS.SHIPPED, updatedAt: new Date() }).where(eq(orders.id, orderId));
  return order;
}

export async function completeOrder(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== ORDER_STATUS.SHIPPED) throw new Error("Sipariş tamamlanamaz.");
  await db.update(orders).set({ status: ORDER_STATUS.COMPLETED, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await db
    .update(shipments)
    .set({ status: "delivered", updatedAt: new Date() })
    .where(eq(shipments.orderId, orderId));
  return order;
}

export async function getAdminOrder(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const paymentRows = await db.select().from(payments).where(eq(payments.orderId, orderId));
  const shipmentRows = await db.select().from(shipments).where(eq(shipments.orderId, orderId));
  return { order, items, payments: paymentRows, shipments: shipmentRows };
}

export function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    [ORDER_STATUS.PENDING_PAYMENT]: "Ödeme bekliyor",
    [ORDER_STATUS.PAID]: "Ödendi",
    [ORDER_STATUS.PREPARING]: "Hazırlanıyor",
    [ORDER_STATUS.SHIPPED]: "Kargoda",
    [ORDER_STATUS.COMPLETED]: "Tamamlandı",
    [ORDER_STATUS.CANCELLED]: "İptal",
    [ORDER_STATUS.REFUNDED]: "İade",
  };
  return map[status] ?? status;
}

export async function updateProductAdmin(
  productId: string,
  input: {
    name?: string;
    price?: string;
    stockQty?: number;
    status?: string;
    stockStatus?: string;
  },
) {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Ürün bulunamadı.");
  const patch: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.price !== undefined) {
    const n = Number(input.price);
    if (!Number.isFinite(n) || n < 0) throw new Error("Geçersiz fiyat.");
    patch.price = n.toFixed(2);
  }
  if (input.stockQty !== undefined) {
    if (!Number.isFinite(input.stockQty) || input.stockQty < 0) throw new Error("Geçersiz stok.");
    patch.stockQty = Math.floor(input.stockQty);
    if (input.stockStatus === undefined) {
      patch.stockStatus = patch.stockQty > 0 ? "in_stock" : "out_of_stock";
    }
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.stockStatus !== undefined) patch.stockStatus = input.stockStatus;
  await db.update(products).set(patch).where(eq(products.id, productId));
  const [updated] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return updated!;
}

export type { OrderStatus };
