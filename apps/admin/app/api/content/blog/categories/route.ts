import { deleteBlogCategory, getBlogCategory, saveBlogCategory } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, text } from "../../../../../src/api-helpers";
import { blogCategoryFromForm } from "../../../../../src/blog-input";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const id = text(form, "id") || undefined;
  const back = "/content/blog/categories";
  const existing = id ? await getBlogCategory(id) : null;
  if (id && !existing) return redirectTo(request, back, { hata: "Kategori bulunamadı." });
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "blog_category", entityId: id ?? "new", action: act, before: existing, after });

  if (action === "delete" && id) {
    await deleteBlogCategory(id);
    await audit("delete");
    return redirectTo(request, back, { ok: "silindi" });
  }
  const input = blogCategoryFromForm(form);
  if ("error" in input) return redirectTo(request, id ? `${back}?duzenle=${id}` : back, { hata: input.error });
  try {
    const saved = await saveBlogCategory(input, id);
    await audit(id ? "update" : "create", { ...input, id: saved });
  } catch (err) {
    if (isDuplicateError(err)) return redirectTo(request, id ? `${back}?duzenle=${id}` : back, { hata: `Bu sitede “${input.slug}” adresli bir kategori zaten var.` });
    throw err;
  }
  return redirectTo(request, back, { ok: "kaydedildi" });
}
