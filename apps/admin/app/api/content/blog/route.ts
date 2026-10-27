import { blogSlugTaken, saveBlogPost } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo } from "../../../../src/api-helpers";
import { blogPostFromForm } from "../../../../src/blog-input";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const input = blogPostFromForm(form);
  if ("error" in input) return redirectTo(request, "/content/blog/new", { hata: input.error });
  if (await blogSlugTaken(input.tenantId, input.slug)) {
    return redirectTo(request, "/content/blog/new", { hata: `Bu sitede “${input.slug}” adresli başka bir yazı var.` });
  }
  const id = await saveBlogPost(input);
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "blog_post", entityId: id, action: "create", after: { ...input, body: `${input.body.length} karakter` } });
  return redirectTo(request, `/content/blog/${id}`, { ok: "olusturuldu" });
}
