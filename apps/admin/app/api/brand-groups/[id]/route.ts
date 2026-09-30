import { eq } from "drizzle-orm";
import { brandGroupMembers, brandGroups, db } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";
import { recompileTenants, setGroupMembers, tenantsUsingGroup } from "../../../../src/brand-groups";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const action = text(form, "_action") || "save";

  const [group] = await db.select().from(brandGroups).where(eq(brandGroups.id, id)).limit(1);
  if (!group) return redirectTo(request, "/catalog/groups", { hata: "Grup bulunamadı." });
  const before = (await db.select({ brandId: brandGroupMembers.brandId }).from(brandGroupMembers).where(eq(brandGroupMembers.groupId, id))).map(
    (m) => m.brandId,
  );
  const tenantIds = await tenantsUsingGroup(id);
  const audit = (act: string, after?: unknown) =>
    writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "brand_group",
      entityId: id,
      action: act,
      before: { name: group.name, members: before.length },
      after,
    });

  if (action === "delete") {
    if (tenantIds.length) {
      return redirectTo(request, `/catalog/groups/${id}`, {
        hata: `Bu grup ${tenantIds.length} sitenin katalog ayarında kullanılıyor. Önce site ayarlarından kaldırın.`,
      });
    }
    await db.delete(brandGroups).where(eq(brandGroups.id, id));
    await audit("delete");
    return redirectTo(request, "/catalog/groups", { ok: "silindi" });
  }

  const name = text(form, "name");
  if (!name) return redirectTo(request, `/catalog/groups/${id}`, { hata: "Grup adı zorunlu." });
  if (name !== group.name) await db.update(brandGroups).set({ name }).where(eq(brandGroups.id, id));

  const next = [...new Set(form.getAll("brandIds").map(String))];
  const changed = next.length !== before.length || next.some((b) => !before.includes(b));
  let n = before.length;
  if (changed) n = await setGroupMembers(id, next);
  await audit("update", { name, members: n });

  if (changed && tenantIds.length) {
    recompileTenants(tenantIds);
    return redirectTo(request, `/catalog/groups/${id}`, { ok: "derleniyor" });
  }
  return redirectTo(request, `/catalog/groups/${id}`, { ok: "kaydedildi" });
}
