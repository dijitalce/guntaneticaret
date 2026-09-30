import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo } from "../../../../../src/api-helpers";
import { startServerSync } from "../../../../../src/server-sync";

/** Eski "feed'i çalıştır" düğmesi: dosya yolu bilgisayara bağlı olabileceği için tam sunucu senkronunu başlatır. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const result = startServerSync({ trigger: `panel:${session.user.email}` });
  if (!result.ok) return redirectTo(request, "/integrations/xml", { hata: result.error });
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "supplier_sync", entityId: id, action: "run_full" });
  return redirectTo(request, "/integrations/xml", { ok: "basladi" });
}
