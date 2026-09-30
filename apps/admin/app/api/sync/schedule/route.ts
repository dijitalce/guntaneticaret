import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";
import { parseHours, saveSyncHours } from "../../../../src/sync-schedule";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const hours = parseHours(text(form, "hours"));
  if (!hours.length) return redirectTo(request, "/integrations/xml", { hata: "En az bir saat girin (ör. 6 veya 6,18)." });
  await saveSyncHours(hours);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "supplier_sync",
    entityId: "schedule",
    action: "update",
    after: { hours },
  });
  return redirectTo(request, "/integrations/xml", { ok: "saatler" });
}
