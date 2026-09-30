import { deletePopup, getPopup, savePopup, setPopupActive } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";
import { popupFromForm } from "../../../../src/popup-form";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const popup = await getPopup(id);
  if (!popup) return redirectTo(request, "/marketing/popups");
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "popup", entityId: id, action: act, before: popup, after });

  if (action === "delete") {
    await deletePopup(id);
    await audit("delete");
    return redirectTo(request, "/marketing/popups", { ok: "silindi" });
  }
  if (action === "toggle") {
    await setPopupActive(id, !popup.is_active);
    await audit(popup.is_active ? "deactivate" : "activate");
    return redirectTo(request, text(form, "back") === "list" ? "/marketing/popups" : `/marketing/popups/${id}`, { ok: "kaydedildi" });
  }
  const input = popupFromForm(form);
  if ("error" in input) return redirectTo(request, `/marketing/popups/${id}`, { hata: input.error });
  await savePopup(id, input);
  await audit("update", input);
  return redirectTo(request, `/marketing/popups/${id}`, { ok: "kaydedildi" });
}
