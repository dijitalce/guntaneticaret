import { asc } from "drizzle-orm";
import { db, seedBlogPlan, tenants } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";

/** SEO haritasındaki blog konularını taslak olarak yükler; site seçiliyse yalnız onu, değilse tüm siteleri kapsar. */
export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const site = text(form, "site");
  const rows = await db.select({ id: tenants.id }).from(tenants).orderBy(asc(tenants.name));
  const targets = site ? rows.filter((t) => t.id === site) : rows;
  let created = 0;
  let updated = 0;
  for (const t of targets) {
    const r = await seedBlogPlan(t.id);
    created += r.created;
    updated += r.updated;
  }
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "blog_post", entityId: site || "all", action: "seed_plan", after: { created, updated } });
  return redirectTo(request, "/content/blog", { ok: "plan", adet: String(created), guncel: String(updated) });
}
