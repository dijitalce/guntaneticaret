import { savePopup } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo } from "../../../src/api-helpers";
import { popupFromForm } from "../../../src/popup-form";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const input = popupFromForm(await request.formData());
  if ("error" in input) return redirectTo(request, "/marketing/popups/new", { hata: input.error });
  const id = await savePopup(null, input);
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "popup", entityId: id, action: "create", after: input });
  return redirectTo(request, `/marketing/popups/${id}`, { ok: "olusturuldu" });
}
