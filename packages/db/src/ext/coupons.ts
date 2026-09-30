import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, num, rows } from "./sql";

export type CouponRow = {
  id: string;
  tenant_id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: string;
  min_subtotal: string | null;
  is_active: number;
  created_at: Date;
  description: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
  usage_limit: number | null;
  used_count: number;
};

export async function listCoupons(tenantId?: string | null) {
  await ensureExtTables();
  return rows<CouponRow>(sql`select c.id, c.tenant_id, c.code, c.type, c.value, c.min_subtotal, c.is_active, c.created_at,
      m.description, m.starts_at, m.ends_at, m.usage_limit, coalesce(m.used_count, 0) used_count
    from coupons c left join coupon_meta m on m.coupon_id = c.id
    ${tenantId ? sql`where c.tenant_id = ${tenantId}` : sql``}
    order by c.created_at desc limit 500`);
}

export async function getCoupon(id: string) {
  await ensureExtTables();
  return first<CouponRow>(sql`select c.id, c.tenant_id, c.code, c.type, c.value, c.min_subtotal, c.is_active, c.created_at,
      m.description, m.starts_at, m.ends_at, m.usage_limit, coalesce(m.used_count, 0) used_count
    from coupons c left join coupon_meta m on m.coupon_id = c.id where c.id = ${id} limit 1`);
}

export async function saveCouponMeta(couponId: string, meta: { description: string | null; startsAt: Date | null; endsAt: Date | null; usageLimit: number | null }) {
  await ensureExtTables();
  await exec(sql`insert into coupon_meta (coupon_id, description, starts_at, ends_at, usage_limit)
    values (${couponId}, ${meta.description}, ${meta.startsAt}, ${meta.endsAt}, ${meta.usageLimit})
    on duplicate key update description = values(description), starts_at = values(starts_at), ends_at = values(ends_at), usage_limit = values(usage_limit)`);
}

export type CouponResult = { ok: true; couponId: string; code: string; discount: number; freeShipping: boolean } | { ok: false; error: string };

/** Sepet ara toplamına göre kuponu doğrular ve indirim tutarını hesaplar. */
export async function evaluateCoupon(tenantId: string, rawCode: string, subtotal: number): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Kupon kodu boş." };
  await ensureExtTables();
  const c = await first<CouponRow>(sql`select c.id, c.tenant_id, c.code, c.type, c.value, c.min_subtotal, c.is_active, c.created_at,
      m.description, m.starts_at, m.ends_at, m.usage_limit, coalesce(m.used_count, 0) used_count
    from coupons c left join coupon_meta m on m.coupon_id = c.id
    where c.tenant_id = ${tenantId} and upper(c.code) = ${code} limit 1`);
  if (!c || !num(c.is_active)) return { ok: false, error: "Kupon kodu geçersiz." };
  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { ok: false, error: "Kupon henüz başlamadı." };
  if (c.ends_at && new Date(c.ends_at).getTime() < now) return { ok: false, error: "Kuponun süresi doldu." };
  if (c.usage_limit != null && num(c.used_count) >= num(c.usage_limit)) return { ok: false, error: "Kupon kullanım limiti doldu." };
  const min = num(c.min_subtotal);
  if (min > 0 && subtotal < min) return { ok: false, error: `Bu kupon ${min.toLocaleString("tr-TR")} TL ve üzeri siparişlerde geçerli.` };
  const value = num(c.value);
  let discount = 0;
  if (c.type === "percent") discount = (subtotal * Math.min(100, value)) / 100;
  else if (c.type === "fixed") discount = Math.min(subtotal, value);
  return { ok: true, couponId: c.id, code: c.code, discount: Math.round(discount * 100) / 100, freeShipping: c.type === "free_shipping" };
}

export async function markCouponUsed(couponId: string) {
  await ensureExtTables();
  await exec(sql`insert into coupon_meta (coupon_id, used_count) values (${couponId}, 1)
    on duplicate key update used_count = used_count + 1`);
}
