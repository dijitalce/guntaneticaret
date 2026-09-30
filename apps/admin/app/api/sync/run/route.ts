import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";
import { startServerSync } from "../../../../src/server-sync";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const skipFetch = text(form, "mode") === "import";
  const result = startServerSync({ trigger: `panel:${session.user.email}`, skipFetch });
  if (!result.ok) return redirectTo(request, "/integrations/xml", { hata: result.error });
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "supplier_sync",
    entityId: "server",
    action: skipFetch ? "run_import_only" : "run_full",
  });
  return redirectTo(request, "/integrations/xml", { ok: "basladi" });
}
