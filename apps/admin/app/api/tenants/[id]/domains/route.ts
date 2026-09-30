import { and, eq } from "drizzle-orm";
import { db, tenantDomains, tenants } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, text } from "../../../../../src/api-helpers";
import { refreshTenantCache } from "../../../../../src/tenant-form";
import { normalizeHostname } from "../../../../../src/tenant-seo";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const action = text(form, "_action");
  const back = `/tenants/${id}`;
  const done = (q: Record<string, string>) => redirectTo(request, back, { sekme: "alan-adlari", ...q });

  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) return redirectTo(request, "/tenants", { hata: "Site bulunamadı." });
  const domains = await db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, id));

  if (action === "add") {
    const hostname = normalizeHostname(text(form, "hostname"));
    if (!hostname) return done({ hata: "Alan adı geçersiz. Örnek: ornekotoparca.com" });
    const makePrimary = form.get("primary") === "on" || domains.length === 0;
    try {
      if (makePrimary) await db.update(tenantDomains).set({ isPrimary: false }).where(eq(tenantDomains.tenantId, id));
      await db.insert(tenantDomains).values({ tenantId: id, hostname, isPrimary: makePrimary });
    } catch (err) {
      if (isDuplicateError(err)) return done({ hata: `${hostname} başka bir siteye bağlı.` });
      throw err;
    }
    await refreshTenantCache(id, [hostname]);
    await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "tenant_domain", entityId: id, action: "create", after: { hostname, makePrimary } });
    return done({ ok: "alan-eklendi" });
  }

  const domainId = text(form, "domainId");
  const target = domains.find((d) => d.id === domainId);
  if (!target) return done({ hata: "Alan adı bulunamadı." });

  if (action === "primary") {
    await db.update(tenantDomains).set({ isPrimary: false }).where(eq(tenantDomains.tenantId, id));
    await db.update(tenantDomains).set({ isPrimary: true }).where(eq(tenantDomains.id, target.id));
    await refreshTenantCache(id);
    await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "tenant_domain", entityId: id, action: "primary", after: { hostname: target.hostname } });
    return done({ ok: "birincil" });
  }

  if (action === "delete") {
    if (target.isPrimary) return done({ hata: "Birincil alan adı silinemez. Önce başka bir alan adını birincil yapın." });
    await db.delete(tenantDomains).where(and(eq(tenantDomains.id, target.id), eq(tenantDomains.tenantId, id)));
    await refreshTenantCache(id, [target.hostname]);
    await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "tenant_domain", entityId: id, action: "delete", before: { hostname: target.hostname } });
    return done({ ok: "alan-silindi" });
  }

  return done({ hata: "Bilinmeyen işlem." });
}
