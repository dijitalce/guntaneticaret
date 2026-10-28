import { asc } from "drizzle-orm";
import { db, publishReadyDrafts, tenants } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";

/** Taslak yazıları toplu yayınlar (içeriği yazılmamış iskeletler hariç); site seçiliyse yalnız onu, değilse tüm siteleri kapsar. */
export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const site = text(form, "site");
  const rows = await db.select({ id: tenants.id }).from(tenants).orderBy(asc(tenants.name));
  const ids = (site ? rows.filter((t) => t.id === site) : rows).map((t) => t.id);
  const { published, skipped } = await publishReadyDrafts(ids);
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "blog_post", entityId: site || "all", action: "publish_drafts", after: { published, skipped } });
  return redirectTo(request, "/content/blog", { ok: "yayinlandi", adet: String(published), atlanan: String(skipped) });
}
