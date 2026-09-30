import { eq } from "drizzle-orm";
import { DEFAULT_FEED_SECRET, db, newId, saveFeedSecret, suppliers, xmlFeeds } from "@guntan/db";
import { feedConfigFromRow, feedRowMapping } from "@guntan/import";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, slugify } from "../../../src/api-helpers";
import { connectionFromForm, probeAndStore } from "../../../src/feed-source";

async function uniqueSupplierCode(name: string) {
  const base = `XML-${slugify(name).toUpperCase().replace(/-/g, "").slice(0, 16) || "KAYNAK"}`;
  for (let i = 0; i < 50; i++) {
    const code = i ? `${base}${i + 1}` : base;
    const [hit] = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.code, code)).limit(1);
    if (!hit) return code;
  }
  return `${base}-${newId().slice(0, 6).toUpperCase()}`;
}

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const input = connectionFromForm(form, feedConfigFromRow(null, {}), DEFAULT_FEED_SECRET);
  if ("error" in input) return redirectTo(request, "/integrations/xml/sources/new", { hata: input.error ?? "Geçersiz form." });

  const supplierId = newId();
  const feedId = newId();
  try {
    await db.insert(suppliers).values({ id: supplierId, name: input.name, code: await uniqueSupplierCode(input.name) });
    await db.insert(xmlFeeds).values({
      id: feedId,
      supplierId,
      name: input.name,
      url: input.cfg.url,
      mapping: feedRowMapping(input.cfg),
      isActive: 0,
    });
  } catch (err) {
    if (isDuplicateError(err)) return redirectTo(request, "/integrations/xml/sources/new", { hata: "Bu isimde bir kaynak zaten var." });
    throw err;
  }
  await saveFeedSecret(feedId, input.secret);
  const result = await probeAndStore(feedId, input.cfg, input.secret);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "xml_source",
    entityId: feedId,
    action: "create",
    after: { name: input.name, url: input.cfg.url, auth: input.cfg.auth, connected: result.ok },
  });
  return redirectTo(request, `/integrations/xml/sources/${feedId}`, result.ok ? { ok: "baglandi" } : { hata: result.error });
}
