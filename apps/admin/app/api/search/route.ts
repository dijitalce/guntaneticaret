import { NextResponse } from "next/server";
import { desc, like, or, sql } from "drizzle-orm";
import { customers, db, orders, products } from "@guntan/db";
import { orderStatusLabel } from "@guntan/ecommerce";
import { apiAdminSession } from "../../../src/api-helpers";

export const dynamic = "force-dynamic";

export type SearchHit = { group: "Siparişler" | "Müşteriler" | "Ürünler"; title: string; sub: string; href: string };

export async function GET(request: Request) {
  const session = await apiAdminSession();
  if (!session) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const esc = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const contains = `%${esc}%`;
  const prefix = `${esc}%`;

  const [orderRows, customerRows, productRows] = await Promise.all([
    db
      .select({ id: orders.id, no: orders.orderNo, name: orders.fullName, email: orders.email, status: orders.status, total: orders.grandTotal })
      .from(orders)
      .where(or(like(orders.orderNo, contains), like(orders.email, contains), like(orders.fullName, contains), like(orders.phone, contains)))
      .orderBy(desc(orders.createdAt))
      .limit(5),
    db
      .select({ id: customers.id, first: customers.firstName, last: customers.lastName, email: customers.email, phone: customers.phone })
      .from(customers)
      .where(
        or(
          like(customers.email, contains),
          like(customers.phone, contains),
          like(sql`concat(${customers.firstName}, ' ', ${customers.lastName})`, contains),
        ),
      )
      .limit(5),
    db
      .select({ id: products.id, name: products.name, sku: products.sku, price: products.price, stock: products.stockQty })
      .from(products)
      .where(
        or(
          like(products.sku, prefix),
          sql`exists (select 1 from product_oems po where po.product_id = ${products.id} and po.raw like ${prefix})`,
          ...(q.length >= 3 ? [like(products.name, contains)] : []),
        ),
      )
      .limit(6),
  ]);

  const money = (v: string | number) => Number(v).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
  const hits: SearchHit[] = [
    ...orderRows.map((o) => ({
      group: "Siparişler" as const,
      title: `${o.no} · ${o.name}`,
      sub: `${orderStatusLabel(o.status)} · ${money(o.total)} · ${o.email}`,
      href: `/orders/${o.id}`,
    })),
    ...customerRows.map((c) => ({
      group: "Müşteriler" as const,
      title: `${c.first} ${c.last}`.trim() || c.email,
      sub: [c.email, c.phone].filter(Boolean).join(" · "),
      href: `/customers/${c.id}`,
    })),
    ...productRows.map((p) => ({
      group: "Ürünler" as const,
      title: p.name,
      sub: `${p.sku} · ${money(p.price)} · stok ${p.stock}`,
      href: `/catalog/products?id=${p.id}`,
    })),
  ];
  return NextResponse.json({ hits });
}
