import { coupons, db, newId, saveCouponMeta, tenants } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, text } from "../../../src/api-helpers";
import { couponFromForm } from "../../../src/coupon-input";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const input = couponFromForm(form);
  if ("error" in input) return redirectTo(request, "/marketing/coupons/new", { hata: input.error! });
  const tenantId = text(form, "tenantId");
  const targets = tenantId && tenantId !== "all" ? [tenantId] : (await db.select({ id: tenants.id }).from(tenants)).map((t) => t.id);
  const created: string[] = [];
  let duplicates = 0;
  for (const t of targets) {
    const id = newId();
    try {
      await db.insert(coupons).values({ id, tenantId: t, code: input.code, type: input.type, value: input.value, minSubtotal: input.minSubtotal, isActive: input.isActive });
      await saveCouponMeta(id, input.meta);
      created.push(id);
    } catch (err) {
      if (isDuplicateError(err)) duplicates++;
      else throw err;
    }
  }
  if (!created.length) return redirectTo(request, "/marketing/coupons/new", { hata: "Bu kod bu sitede zaten var." });
  for (const id of created) {
    await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "coupon", entityId: id, action: "create", after: { code: input.code, type: input.type, value: input.value } });
  }
  if (created.length === 1) return redirectTo(request, `/marketing/coupons/${created[0]}`, { ok: "olusturuldu" });
  return redirectTo(request, "/marketing/coupons", { ok: "coklu", adet: String(created.length), atlanan: String(duplicates) });
}
