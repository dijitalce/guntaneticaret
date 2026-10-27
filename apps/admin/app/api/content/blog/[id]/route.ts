import { blogSlugTaken, deleteBlogPost, getBlogPost, saveBlogPost, setBlogPostStatus } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";
import { blogPostFromForm } from "../../../../../src/blog-input";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const post = await getBlogPost(id);
  if (!post) return redirectTo(request, "/content/blog");
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const before = { ...post, body: `${post.body.length} karakter` };
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "blog_post", entityId: id, action: act, before, after });

  if (action === "delete") {
    await deleteBlogPost(id);
    await audit("delete");
    return redirectTo(request, "/content/blog", { ok: "silindi" });
  }
  if (action === "toggle") {
    const next = post.status === "published" ? "draft" : "published";
    await setBlogPostStatus(id, next);
    await audit(next === "published" ? "activate" : "deactivate");
    return redirectTo(request, text(form, "back") === "list" ? "/content/blog" : `/content/blog/${id}`, { ok: "kaydedildi" });
  }
  const input = blogPostFromForm(form);
  if ("error" in input) return redirectTo(request, `/content/blog/${id}`, { hata: input.error });
  if (await blogSlugTaken(input.tenantId, input.slug, id)) {
    return redirectTo(request, `/content/blog/${id}`, { hata: `Bu sitede “${input.slug}” adresli başka bir yazı var.` });
  }
  await saveBlogPost(input, id);
  await audit("update", { ...input, body: `${input.body.length} karakter` });
  return redirectTo(request, `/content/blog/${id}`, { ok: "kaydedildi" });
}
