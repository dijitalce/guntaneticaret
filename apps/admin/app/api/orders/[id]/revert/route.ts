import { revertOrderStatus } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, safeNext } from "../../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData().catch(() => null);
  const back = safeNext(form?.get("next") ?? null, `/orders/${id}`);
  try {
    const target = await revertOrderStatus(id, session.user.name || session.user.email);
    await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "order", entityId: id, action: "revert", after: { status: target } });
  } catch (e) {
    return redirectTo(request, back, { hata: "1", mesaj: e instanceof Error ? e.message : "Durum geri alınamadı." });
  }
  return redirectTo(request, back, { ok: "revert" });
}
