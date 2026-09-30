import { brandGroups, db, newId } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, slugify, text } from "../../../src/api-helpers";
import { setGroupMembers } from "../../../src/brand-groups";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();

  const name = text(form, "name");
  const slug = slugify(text(form, "slug") || name);
  if (!name || !slug) return redirectTo(request, "/catalog/groups/new", { hata: "Grup adı zorunlu." });

  const id = newId();
  try {
    await db.insert(brandGroups).values({ id, name, slug });
  } catch (err) {
    const msg = isDuplicateError(err) ? `“${slug}” adresiyle bir grup zaten var.` : "Grup kaydedilemedi.";
    return redirectTo(request, "/catalog/groups/new", { hata: msg });
  }
  const brandIds = form.getAll("brandIds").map(String);
  const n = await setGroupMembers(id, brandIds);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "brand_group",
    entityId: id,
    action: "create",
    after: { name, slug, members: n },
  });
  return redirectTo(request, `/catalog/groups/${id}`, { ok: "olusturuldu" });
}
