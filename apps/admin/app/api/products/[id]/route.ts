import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { updateProductAdmin } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";
import { adminRedirect } from "../../../../src/paths";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) {
    return wantsJson
      ? NextResponse.json({ error: "Oturum süresi doldu, yeniden giriş yapın." }, { status: 401 })
      : NextResponse.redirect(adminRedirect("/login", request), 303);
  }
  const { id } = await ctx.params;
  const form = await request.formData();
  const next = String(form.get("next") ?? "/catalog/products");
  try {
    const updated = await updateProductAdmin(id, {
      name: form.has("name") ? String(form.get("name")) : undefined,
      price: form.has("price") ? String(form.get("price")) : undefined,
      stockQty: form.has("stockQty") ? Number(form.get("stockQty")) : undefined,
      status: form.has("status") ? String(form.get("status")) : undefined,
      stockStatus: form.has("stockStatus") ? String(form.get("stockStatus")) : undefined,
    });
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "product",
      entityId: id,
      action: "update",
      after: { price: updated.price, stockQty: updated.stockQty, status: updated.status },
    });
    if (wantsJson) {
      return NextResponse.json({
        price: updated.price,
        stockQty: updated.stockQty,
        status: updated.status,
        stockStatus: updated.stockStatus,
        updatedAt: updated.updatedAt,
      });
    }
  } catch (e) {
    if (wantsJson) return NextResponse.json({ error: e instanceof Error ? e.message : "Güncelleme başarısız." }, { status: 400 });
    return NextResponse.redirect(adminRedirect(`${next}${next.includes("?") ? "&" : "?"}hata=1`, request), 303);
  }
  return NextResponse.redirect(adminRedirect(`${next}${next.includes("?") ? "&" : "?"}ok=1`, request), 303);
}
