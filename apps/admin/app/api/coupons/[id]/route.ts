import { eq, sql } from "drizzle-orm";
import { coupons, db, getCoupon, saveCouponMeta } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, text } from "../../../../src/api-helpers";
import { couponFromForm } from "../../../../src/coupon-input";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const back = `/marketing/coupons/${id}`;
  const coupon = await getCoupon(id);
  if (!coupon) return redirectTo(request, "/marketing/coupons");
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "coupon", entityId: id, action: act, before: coupon, after });

  if (action === "delete") {
    await db.delete(coupons).where(eq(coupons.id, id));
    await db.execute(sql`delete from coupon_meta where coupon_id = ${id}`);
    await audit("delete");
    return redirectTo(request, "/marketing/coupons", { ok: "silindi" });
  }
  if (action === "toggle") {
    await db.update(coupons).set({ isActive: Number(coupon.is_active) ? 0 : 1 }).where(eq(coupons.id, id));
    await audit(Number(coupon.is_active) ? "deactivate" : "activate");
    return redirectTo(request, "/marketing/coupons", { ok: "kaydedildi" });
  }
  const input = couponFromForm(form);
  if ("error" in input) return redirectTo(request, back, { hata: input.error! });
  try {
    await db
      .update(coupons)
      .set({ code: input.code, type: input.type, value: input.value, minSubtotal: input.minSubtotal, isActive: input.isActive })
      .where(eq(coupons.id, id));
  } catch (err) {
    if (isDuplicateError(err)) return redirectTo(request, back, { hata: "Bu kod bu sitede başka bir kuponda kullanılıyor." });
    throw err;
  }
  await saveCouponMeta(id, input.meta);
  await audit("update", { code: input.code, type: input.type, value: input.value, ...input.meta });
  return redirectTo(request, back, { ok: "kaydedildi" });
}
