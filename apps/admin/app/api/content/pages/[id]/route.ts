import { eq } from "drizzle-orm";
import { db, pages } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, text } from "../../../../../src/api-helpers";
import { pageFromForm } from "../../../../../src/content-forms";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const [page] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!page) return redirectTo(request, "/content/pages");
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "page", entityId: id, action: act, before: page, after });

  if (action === "delete") {
    await db.delete(pages).where(eq(pages.id, id));
    await audit("delete");
    return redirectTo(request, "/content/pages", { ok: "silindi" });
  }
  if (action === "toggle") {
    await db.update(pages).set({ isPublished: page.isPublished ? 0 : 1 }).where(eq(pages.id, id));
    await audit(page.isPublished ? "deactivate" : "activate");
    return redirectTo(request, text(form, "back") === "list" ? "/content/pages" : `/content/pages/${id}`, { ok: "kaydedildi" });
  }
  const input = pageFromForm(form);
  if ("error" in input) return redirectTo(request, `/content/pages/${id}`, { hata: input.error ?? "Geçersiz form." });
  try {
    await db.update(pages).set(input).where(eq(pages.id, id));
  } catch (err) {
    if (isDuplicateError(err)) return redirectTo(request, `/content/pages/${id}`, { hata: `Bu sitede “${input.slug}” adresli başka bir sayfa var.` });
    throw err;
  }
  await audit("update", input);
  return redirectTo(request, `/content/pages/${id}`, { ok: "kaydedildi" });
}
