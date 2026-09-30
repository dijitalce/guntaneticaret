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
  addOrderEventSafe,
  attachOrderAttribution,
  evaluateCoupon,
  getCustomerMeta,
  getShippingSettings,
  markCouponUsed,
  notifyOrder,
  notifyOrderInBackground,
  sendServerPurchaseInBackground,
} from "@guntan/db";
import { amountWithInstallment, garantiConfigFromEnv, getPaymentProvider } from "@guntan/payments";
import {
  arasConfigFromEnv,
  createArasOrder,
  getShippingProvider,
  queryArasByIntegrationCode,
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

/** Kargo ayarlarındaki sabit ücret ve ücretsiz kargo eşiğine göre tutar. */
export async function shippingFeeFor(subtotal: number, opts: { freeShipping?: boolean } = {}): Promise<number> {
  if (opts.freeShipping) return 0;
  const s = await getShippingSettings().catch(() => null);
  if (!s) return shippingAmountForSubtotal(subtotal);
  if (s.freeShippingThreshold > 0 && subtotal >= s.freeShippingThreshold) return 0;
  return Math.max(0, Number(s.flatFee) || 0);
}

export async function getCartSummary(tenantId: string, sessionId?: string | null, customerId?: string | null) {
  const empty = {
    qty: 0,
    subtotal: 0,
    shippingAmount: await shippingFeeFor(0),
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
  const shippingAmount = await shippingFeeFor(view.subtotal);
  return {
    qty,
    subtotal: view.subtotal,
    shippingAmount,
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

/** Baştaki 0 / +90 hariç 10 hane; alan kodu 2–5 ile başlar (sabit hat veya cep). */
export function isValidTrPhone(raw: string): boolean {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return /^[2-5]\d{9}$/.test(d);
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
  /** Verilirse kartla ödeme: sepet ödeme onayına kadar korunur. */
  card?: { installments: number };
  couponCode?: string;
  /** Ziyaret oturumu (kaynak/cihaz bilgisi siparişe kopyalanır). */
  visitorSessionId?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}) {
  const garanti = input.card ? garantiConfigFromEnv() : null;
  if (input.card && !garanti) throw new Error("Kartla ödeme şu an kullanılamıyor.");
  await expireStaleCardOrders().catch(() => undefined);
  const view = await getCartView(input.cartId);
  if (view.items.length === 0) throw new Error("Sepet boş.");
  if (input.customerId && (await getCustomerMeta(input.customerId).catch(() => null))?.is_blocked) {
    throw new Error("Hesabınız sipariş vermeye kapalı. Lütfen bizimle iletişime geçin.");
  }
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
  if (!isValidTrPhone(input.phone)) throw new Error("Telefon numarası geçersiz.");
  if (input.shipping.phone && !isValidTrPhone(input.shipping.phone)) throw new Error("Teslimat telefonu geçersiz.");
  const nationalId = input.nationalId?.trim() ?? "";
  if (nationalId && !/^[1-9]\d{10}$/.test(nationalId)) throw new Error("T.C. kimlik no 11 haneli olmalı.");

  for (const item of view.items) {
    if (availableStock(item.stockQty, item.reservedQty) < item.qty) {
      throw new Error(`${item.name} için yetersiz stok.`);
    }
  }

  let discount = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let freeShipping = false;
  if (input.couponCode?.trim()) {
    const coupon = await evaluateCoupon(input.tenantId, input.couponCode, view.subtotal);
    if (!coupon.ok) throw new Error(coupon.error);
    discount = coupon.discount;
    couponId = coupon.couponId;
    couponCode = coupon.code;
    freeShipping = coupon.freeShipping;
  }
  const shipping = await shippingFeeFor(view.subtotal - discount, { freeShipping });
  const baseTotal = Math.max(0, view.subtotal - discount) + shipping;
  let installments = 1;
  let grand = baseTotal;
  if (input.card && garanti) {
    installments = Math.max(1, Math.floor(input.card.installments || 1));
    if (installments > 1 && baseTotal < garanti.installmentMinAmount) throw new Error("Bu tutarda taksit yok.");
    grand = amountWithInstallment(baseTotal, installments, garanti);
  }
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
      paymentMethod: input.card ? PAYMENT_METHOD.CREDIT_CARD : PAYMENT_METHOD.BANK_TRANSFER,
      ...(input.card
        ? {
            installments: String(installments),
            installmentFee: (grand - baseTotal).toFixed(2),
            cartId: input.cartId,
          }
        : {}),
    },
    subtotal: view.subtotal.toFixed(2),
    shippingTotal: shipping.toFixed(2),
    discountTotal: discount.toFixed(2),
    grandTotal: grand.toFixed(2),
    couponCode,
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
    method: input.card ? PAYMENT_METHOD.CREDIT_CARD : PAYMENT_METHOD.BANK_TRANSFER,
    status: PAYMENT_STATUS.AWAITING,
    amount: grand.toFixed(2),
    providerRef: orderNo,
  });

  if (couponId) await markCouponUsed(couponId).catch(() => undefined);
  await addOrderEventSafe({
    orderId: order.id,
    kind: "created",
    title: input.card ? "Sipariş oluşturuldu, kart ödemesi bekleniyor" : "Sipariş oluşturuldu (Havale / EFT)",
    body: couponCode ? `Kupon: ${couponCode} (-${discount.toFixed(2)} TL)` : null,
    actor: "Müşteri",
  });
  await attachOrderAttribution({
    orderId: order.id,
    sid: input.visitorSessionId,
    cartId: input.cartId,
    ip: input.clientIp,
    ua: input.userAgent,
  }).catch(() => undefined);

  if (input.card) {
    const [savedOrder] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    return { order: savedOrder!, intent: null };
  }

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
  notifyOrderInBackground(order.id, "order_created_bank");
  sendServerPurchaseInBackground(order.id);
  return { order: savedOrder!, intent };
}

export async function confirmBankTransfer(orderId: string, actor?: string) {
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
  await addOrderEventSafe({ orderId, kind: "payment", title: "Havale ödemesi onaylandı", body: `Tutar: ${order.grandTotal} TL`, actor });
  notifyOrderInBackground(orderId, "payment_confirmed");
  return order;
}

export async function cancelOrder(orderId: string, opts: { actor?: string; reason?: string; notify?: boolean } = {}) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const wasPaid = order?.status === ORDER_STATUS.PAID || order?.status === ORDER_STATUS.PREPARING;
  if (!order || (order.status !== ORDER_STATUS.PENDING_PAYMENT && !wasPaid)) throw new Error("Sipariş iptal edilemez.");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    await db
      .update(products)
      .set(
        wasPaid
          ? { stockQty: sql`${products.stockQty} + ${item.qty}` }
          : { reservedQty: sql`greatest(${products.reservedQty} - ${item.qty}, 0)` },
      )
      .where(eq(products.id, item.productId));
  }
  await db.update(orders).set({ status: ORDER_STATUS.CANCELLED }).where(eq(orders.id, orderId));
  if (!wasPaid) await db.update(payments).set({ status: PAYMENT_STATUS.CANCELLED }).where(eq(payments.orderId, orderId));
  const body = [opts.reason, wasPaid ? "Ödeme alınmıştı: tutarın müşteriye iadesini banka üzerinden yapmayı unutmayın. Stok geri eklendi." : null]
    .filter(Boolean)
    .join(" · ");
  await addOrderEventSafe({ orderId, kind: "status", title: "Sipariş iptal edildi", body: body || null, actor: opts.actor });
  if (opts.notify) notifyOrderInBackground(orderId, "order_cancelled");
}

const CARD_ORDER_TTL_MINUTES = 30;

/** Banka sayfasında yarım bırakılan kart siparişlerinin stok rezervasyonunu bırakır. */
export async function expireStaleCardOrders() {
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        eq(orders.status, ORDER_STATUS.PENDING_PAYMENT),
        eq(payments.method, PAYMENT_METHOD.CREDIT_CARD),
        sql`${orders.createdAt} < now() - interval ${sql.raw(String(CARD_ORDER_TTL_MINUTES))} minute`,
      ),
    )
    .limit(50);
  for (const row of stale) await cancelOrder(row.id, { reason: `Kart ödemesi ${CARD_ORDER_TTL_MINUTES} dakika içinde tamamlanmadı; stok rezervasyonu bırakıldı.` }).catch(() => undefined);
  return stale.length;
}

async function getCardOrder(orderNo: string) {
  const [order] = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
  if (!order) return null;
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, order.id), eq(payments.method, PAYMENT_METHOD.CREDIT_CARD)))
    .limit(1);
  return payment ? { order, payment } : null;
}

/**
 * Banka onayını siparişe işler. Aynı cevap iki kez gelirse ikinci çağrı stok düşmez.
 * Tutar kuruş cinsinden bankadan gelen değerdir; kayıttakiyle eşleşmezse reddedilir.
 */
export async function confirmCardPayment(
  orderNo: string,
  input: { amountKurus: string; authCode?: string; hostRef?: string },
): Promise<{ order: typeof orders.$inferSelect; alreadyPaid: boolean }> {
  const found = await getCardOrder(orderNo);
  if (!found) throw new Error("Sipariş bulunamadı.");
  const { order, payment } = found;
  if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
    if (payment.status === PAYMENT_STATUS.CONFIRMED) return { order, alreadyPaid: true };
    throw new Error("Sipariş ödeme beklemiyor.");
  }
  if (String(Math.round(Number(payment.amount) * 100)) !== input.amountKurus) {
    throw new Error("Ödenen tutar sipariş tutarıyla eşleşmiyor.");
  }

  const [res] = await db
    .update(orders)
    .set({ status: ORDER_STATUS.PAID, updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.status, ORDER_STATUS.PENDING_PAYMENT)));
  if ((res as { affectedRows?: number }).affectedRows !== 1) return { order, alreadyPaid: true };

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  for (const item of items) {
    await db
      .update(products)
      .set({
        stockQty: sql`greatest(${products.stockQty} - ${item.qty}, 0)`,
        reservedQty: sql`greatest(${products.reservedQty} - ${item.qty}, 0)`,
      })
      .where(eq(products.id, item.productId));
  }
  const ref = [input.hostRef, input.authCode].filter(Boolean).join("/");
  await db
    .update(payments)
    .set({ status: PAYMENT_STATUS.CONFIRMED, providerRef: ref ? `${orderNo}:${ref}`.slice(0, 255) : payment.providerRef })
    .where(eq(payments.id, payment.id));

  const cartId = order.shippingAddress?.cartId;
  if (cartId) await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await addOrderEventSafe({ orderId: order.id, kind: "payment", title: "Kart ödemesi onaylandı", body: ref ? `Banka referansı: ${ref}` : null, actor: "Garanti BBVA" });
  notifyOrderInBackground(order.id, "order_created");
  sendServerPurchaseInBackground(order.id);
  return { order, alreadyPaid: false };
}

/** Başarısız/iptal edilen kart ödemesinde siparişi iptal edip rezervasyonu bırakır; sepet yerinde kalır. */
export async function failCardPayment(orderNo: string) {
  const found = await getCardOrder(orderNo);
  if (!found || found.order.status !== ORDER_STATUS.PENDING_PAYMENT) return;
  await cancelOrder(found.order.id, { reason: "Kart ödemesi banka tarafından onaylanmadı." });
}

export async function markOrderPreparing(orderId: string, actor?: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== ORDER_STATUS.PAID) throw new Error("Sipariş hazırlanamaz.");
  await db.update(orders).set({ status: ORDER_STATUS.PREPARING, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await addOrderEventSafe({ orderId, kind: "status", title: "Sipariş hazırlanıyor", actor });
  notifyOrderInBackground(orderId, "order_preparing");
  return order;
}

export async function shipOrder(
  orderId: string,
  input: { carrier?: string; trackingNo?: string } = {},
  actor?: string,
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
  const carrierText = [input.carrier?.trim(), input.trackingNo?.trim() ? `takip no ${input.trackingNo.trim()}` : ""].filter(Boolean).join(" · ");
  await addOrderEventSafe({ orderId, kind: "shipment", title: "Kargoya verildi", body: carrierText || null, actor });
  if (input.trackingNo?.trim() || input.carrier !== ARAS_CARRIER) notifyOrderInBackground(orderId, "order_shipped");
  return order;
}

export const ARAS_CARRIER = "Aras Kargo";

/** Aras'ta gönderi kaydı açar (entegrasyon kodu = sipariş no) ve siparişi kargoya verildi yapar. */
export async function shipOrderWithAras(orderId: string, input: { pieceCount?: number; weightKg?: number } = {}, actor?: string) {
  const config = arasConfigFromEnv();
  if (!config) throw new Error("Aras Kargo entegrasyonu ayarlı değil.");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || (order.status !== ORDER_STATUS.PAID && order.status !== ORDER_STATUS.PREPARING)) {
    throw new Error("Sipariş kargolanamaz.");
  }
  const a = order.shippingAddress ?? {};
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const result = await createArasOrder(config, {
    integrationCode: order.orderNo,
    receiverName: a.shipFullName || order.fullName,
    receiverAddress: [a.line1, a.line2, a.postalCode].filter(Boolean).join(" "),
    receiverPhone: a.shipPhone || order.phone,
    receiverCity: a.city ?? "",
    receiverTown: a.district ?? "",
    pieceCount: input.pieceCount,
    weightKg: input.weightKg,
    description: items.map((i) => `${i.qty}x ${i.sku}`).join(", ").slice(0, 200),
  });
  if (!result.ok) throw new Error(`Aras gönderi kaydı reddedildi: ${result.message || result.code}`);
  await shipOrder(orderId, { carrier: ARAS_CARRIER }, actor);
  return result;
}

/** Kargodaki Aras gönderilerinin takip no ve teslim durumunu günceller. */
export async function syncArasShipments(log: (msg: string) => void = () => undefined) {
  const config = arasConfigFromEnv();
  if (!config) {
    log("Aras ayarlı değil (ARAS_USERNAME/ARAS_PASSWORD); atlanıyor.");
    return { checked: 0, tracked: 0, delivered: 0, errors: 0 };
  }
  const rows = await db
    .select({ shipmentId: shipments.id, trackingNo: shipments.trackingNo, orderId: orders.id, orderNo: orders.orderNo })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .where(and(eq(shipments.carrier, ARAS_CARRIER), eq(orders.status, ORDER_STATUS.SHIPPED)))
    .limit(500);
  const stats = { checked: 0, tracked: 0, delivered: 0, errors: 0 };
  for (const row of rows) {
    stats.checked++;
    try {
      const t = await queryArasByIntegrationCode(config, row.orderNo);
      if (!t.found) continue;
      if (t.trackingNo && t.trackingNo !== row.trackingNo) {
        await db
          .update(shipments)
          .set({ trackingNo: t.trackingNo, updatedAt: new Date() })
          .where(eq(shipments.id, row.shipmentId));
        stats.tracked++;
        await addOrderEventSafe({ orderId: row.orderId, kind: "shipment", title: "Aras takip numarası alındı", body: t.trackingNo, actor: "Aras Kargo" });
        if (!row.trackingNo) await notifyOrder(row.orderId, "order_shipped");
        log(`${row.orderNo}: takip no ${t.trackingNo}`);
      }
      if (t.delivered) {
        await completeOrder(row.orderId, "Aras Kargo");
        stats.delivered++;
        log(`${row.orderNo}: teslim edildi`);
      }
    } catch (err) {
      stats.errors++;
      log(`${row.orderNo}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return stats;
}

export async function completeOrder(orderId: string, actor?: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== ORDER_STATUS.SHIPPED) throw new Error("Sipariş tamamlanamaz.");
  await db.update(orders).set({ status: ORDER_STATUS.COMPLETED, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await db
    .update(shipments)
    .set({ status: "delivered", updatedAt: new Date() })
    .where(eq(shipments.orderId, orderId));
  await addOrderEventSafe({ orderId, kind: "shipment", title: "Teslim edildi", actor });
  await notifyOrder(orderId, "order_delivered");
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

export {
  buildOosPayForm,
  garantiConfigFromEnv,
  installmentOptions,
  parseCallback,
  type GarantiConfig,
} from "@guntan/payments";
export { arasConfigFromEnv, arasTrackingUrl, shippingAmountForSubtotal } from "@guntan/shipping";
