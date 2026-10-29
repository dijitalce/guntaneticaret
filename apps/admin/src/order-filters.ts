import { and, eq, gte, like, or, sql, type SQL } from "drizzle-orm";
import { orders } from "@guntan/db";

export const PERIODS = [
  { value: "", label: "Tüm zamanlar", days: 0 },
  { value: "bugun", label: "Bugün", days: 1 },
  { value: "7g", label: "Son 7 gün", days: 7 },
  { value: "30g", label: "Son 30 gün", days: 30 },
];
export const PAYMENTS = [
  { value: "", label: "Tüm ödemeler" },
  { value: "credit_card", label: "Kart" },
  { value: "bank_transfer", label: "Havale" },
];

export function periodStart(days: number) {
  const trDay = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  return new Date(new Date(`${trDay}T00:00:00+03:00`).getTime() - (days - 1) * 86400_000);
}

/** Durum dışındaki ortak filtreler (liste, sayaçlar ve CSV aynı kuralı kullanır). */
export function orderBaseFilters(sp: { tenant?: string; q?: string; donem?: string; odeme?: string }): SQL[] {
  const base: SQL[] = [];
  const period = PERIODS.find((p) => p.value === (sp.donem ?? ""));
  if (period?.days) base.push(gte(orders.createdAt, periodStart(period.days)));
  if (sp.tenant) base.push(eq(orders.tenantId, sp.tenant));
  const method = PAYMENTS.find((p) => p.value && p.value === sp.odeme);
  if (method) {
    base.push(sql`json_unquote(json_extract(${orders.shippingAddress}, '$.paymentMethod')) = ${method.value}`);
  }
  const q = (sp.q ?? "").trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    base.push(or(like(orders.orderNo, pattern), like(orders.email, pattern), like(orders.fullName, pattern), like(orders.phone, pattern))!);
  }
  return base;
}

export const allOf = (parts: SQL[]) => (parts.length ? and(...parts) : undefined);
