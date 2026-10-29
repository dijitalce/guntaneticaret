import { desc, eq } from "drizzle-orm";
import { db, orders } from "@guntan/db";
import { orderStatusLabel } from "@guntan/ecommerce";
import { allOf, orderBaseFilters } from "../../../../src/order-filters";
import { apiAdminSession, redirectTo } from "../../../../src/api-helpers";

function csv(value: unknown) {
  const s = value == null ? "" : String(value);
  return /[",;\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function GET(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const where = orderBaseFilters(sp);
  if (sp.status) where.push(eq(orders.status, sp.status));
  const rows = await db.select().from(orders).where(allOf(where)).orderBy(desc(orders.createdAt)).limit(20_000);
  const lines = [
    ["Sipariş no", "Tarih", "Müşteri", "E-posta", "Telefon", "Ödeme", "Taksit", "Durum", "Tutar"].join(";"),
    ...rows.map((o) =>
      [
        o.orderNo,
        new Date(o.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
        o.fullName,
        o.email,
        o.phone ?? "",
        o.shippingAddress?.paymentMethod === "credit_card" ? "Kart" : "Havale",
        o.shippingAddress?.installments ?? "1",
        orderStatusLabel(o.status),
        Number(o.grandTotal).toFixed(2).replace(".", ","),
      ]
        .map(csv)
        .join(";"),
    ),
  ];
  return new Response(`﻿${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="siparisler-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
