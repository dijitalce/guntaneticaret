import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { shipOrder, shipOrderWithAras } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";
import { adminRedirect } from "../../../../../src/paths";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(adminRedirect("/login", request), 303);
  const { id } = await ctx.params;
  const form = await request.formData();
  const viaAras = String(form.get("mode") ?? "") === "aras";
  try {
    let after: Record<string, unknown>;
    if (viaAras) {
      const pieceCount = Number(form.get("pieceCount") ?? "1") || 1;
      const weightKg = Number(String(form.get("weightKg") ?? "1").replace(",", ".")) || 1;
      const result = await shipOrderWithAras(id, { pieceCount, weightKg }, session.user.name || session.user.email);
      after = { carrier: "Aras Kargo", integration: true, pieceCount, weightKg, arasMessage: result.message };
    } else {
      const carrier = String(form.get("carrier") ?? "").trim();
      const trackingNo = String(form.get("trackingNo") ?? "").trim();
      if (!carrier || !trackingNo) {
        const url = adminRedirect(`/orders/${id}?hata=1`, request);
        url.searchParams.set("mesaj", "Kargo firması ve takip numarası zorunlu; müşteriye takip bilgisi gönderilir.");
        return NextResponse.redirect(url, 303);
      }
      await shipOrder(id, { carrier, trackingNo }, session.user.name || session.user.email);
      after = { carrier: form.get("carrier"), trackingNo: form.get("trackingNo") };
    }
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "order",
      entityId: id,
      action: "ship",
      after,
    });
  } catch (err) {
    const url = adminRedirect(`/orders/${id}?hata=1`, request);
    if (viaAras && err instanceof Error) url.searchParams.set("mesaj", err.message.slice(0, 200));
    return NextResponse.redirect(url, 303);
  }
  return NextResponse.redirect(adminRedirect(`/orders/${id}?ok=1`, request), 303);
}
