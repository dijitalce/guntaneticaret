import { completeOrder, markOrderPreparing } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, safeNext, text } from "../../../../src/api-helpers";

const ACTIONS = {
  prepare: { run: markOrderPreparing, audit: "prepare", done: "hazırlığa alındı" },
  complete: { run: completeOrder, audit: "complete", done: "tamamlandı" },
} as const;

/** Listeden seçilen siparişlere tek adımda hazırlığa alma veya tamamlama uygular; uygun olmayanlar atlanır. */
export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const back = safeNext(form.get("next"), "/orders");
  const action = ACTIONS[text(form, "_action") as keyof typeof ACTIONS];
  const ids = [...new Set(form.getAll("ids").filter((v): v is string => typeof v === "string"))].slice(0, 200);
  if (!action || ids.length === 0) return redirectTo(request, back, { hata: "1", mesaj: "Önce listeden sipariş seçin." });

  const actor = session.user.name || session.user.email;
  let ok = 0;
  for (const id of ids) {
    try {
      await action.run(id, actor);
      await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "order", entityId: id, action: action.audit });
      ok++;
    } catch {
      // Bu durumda uygulanamayan sipariş atlanır.
    }
  }
  const skipped = ids.length - ok;
  const mesaj = `${ok} sipariş ${action.done}${skipped ? `, ${skipped} sipariş bu adım için uygun olmadığından atlandı` : ""}.`;
  return redirectTo(request, back, ok ? { ok: "bulk", mesaj } : { hata: "1", mesaj });
}
