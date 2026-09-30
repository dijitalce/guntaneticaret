import { randomUUID } from "node:crypto";
import { db, pages } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo } from "../../../../src/api-helpers";
import { pageFromForm } from "../../../../src/content-forms";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const input = pageFromForm(await request.formData());
  if ("error" in input) return redirectTo(request, "/content/pages/new", { hata: input.error ?? "Geçersiz form." });
  const id = randomUUID();
  try {
    await db.insert(pages).values({ id, ...input });
  } catch (err) {
    if (isDuplicateError(err)) return redirectTo(request, "/content/pages/new", { hata: `Bu sitede “${input.slug}” adresli bir sayfa zaten var.` });
    throw err;
  }
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "page", entityId: id, action: "create", after: input });
  return redirectTo(request, `/content/pages/${id}`, { ok: "olusturuldu" });
}
