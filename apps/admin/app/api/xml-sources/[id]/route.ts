import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_FEED_SECRET, compileVisibility, db, getFeedSecret, products, saveFeedProbe, saveFeedSecret, xmlFeeds } from "@guntan/db";
import { CUSTOM_FIELD_LABELS, feedConfigFromRow, feedRowMapping, isCustomFeed, type CustomFeedConfig } from "@guntan/import";
import { writeAudit } from "@guntan/observability";
import { PRODUCT_SOURCE, PRODUCT_STATUS } from "@guntan/types";
import { apiAdminSession, isDuplicateError, redirectTo, text } from "../../../../src/api-helpers";
import { connectionFromForm, mappingIsComplete, probeAndStore } from "../../../../src/feed-source";
import { startServerSync } from "../../../../src/server-sync";

function clampNum(v: string, min: number, max: number, d: number) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const [feed] = await db.select().from(xmlFeeds).where(eq(xmlFeeds.id, id)).limit(1);
  if (!feed || !isCustomFeed(feed.mapping)) return redirectTo(request, "/integrations/xml");
  const back = `/integrations/xml/sources/${id}`;
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const cfg = feedConfigFromRow(feed.url, feed.mapping);
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "xml_source", entityId: id, action: act, before: { name: feed.name, mapping: feed.mapping }, after });

  if (action === "connect") {
    const input = connectionFromForm(form, cfg, await getFeedSecret(id));
    if ("error" in input) return redirectTo(request, back, { hata: input.error ?? "Geçersiz form." });
    try {
      await db.update(xmlFeeds).set({ name: input.name, url: input.cfg.url, mapping: feedRowMapping(input.cfg) }).where(eq(xmlFeeds.id, id));
    } catch (err) {
      if (isDuplicateError(err)) return redirectTo(request, back, { hata: "Bu isimde bir kaynak zaten var." });
      throw err;
    }
    await saveFeedSecret(id, input.secret);
    const result = await probeAndStore(id, input.cfg, input.secret);
    await audit("connect", { name: input.name, url: input.cfg.url, auth: input.cfg.auth, connected: result.ok });
    return redirectTo(request, back, result.ok ? { ok: "baglandi" } : { hata: result.error });
  }

  if (action === "delete") {
    const affected = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.supplierId, feed.supplierId), eq(products.source, PRODUCT_SOURCE.XML)));
    for (let i = 0; i < affected.length; i += 500) {
      await db
        .update(products)
        .set({ status: PRODUCT_STATUS.MISSING_FROM_FEED })
        .where(inArray(products.id, affected.slice(i, i + 500).map((p) => p.id)));
    }
    await db.delete(xmlFeeds).where(eq(xmlFeeds.id, id));
    await saveFeedSecret(id, DEFAULT_FEED_SECRET);
    await saveFeedProbe(id, { probedAt: new Date().toISOString(), ok: false, error: "silindi" });
    await audit("delete", { removedProducts: affected.length });
    if (affected.length) void compileVisibility(db).catch((err) => console.error("compileVisibility", err));
    return redirectTo(request, "/integrations/xml", { ok: "kaynak-silindi" });
  }

  if (action === "toggle") {
    if (!feed.isActive && !mappingIsComplete(cfg)) return redirectTo(request, back, { hata: "Önce alan eşleştirmesini tamamlayıp kaydedin." });
    await db.update(xmlFeeds).set({ isActive: feed.isActive ? 0 : 1 }).where(eq(xmlFeeds.id, id));
    await audit(feed.isActive ? "deactivate" : "activate");
    return redirectTo(request, back, { ok: feed.isActive ? "pasif" : "aktif" });
  }

  if (action === "run") {
    if (!feed.isActive || !mappingIsComplete(cfg)) return redirectTo(request, back, { hata: "Kaynak aktif değil veya eşleştirme eksik." });
    const result = startServerSync({ trigger: `panel:${session.user.email}`, feedId: id });
    if (!result.ok) return redirectTo(request, back, { hata: result.error });
    await audit("run_feed");
    return redirectTo(request, back, { ok: "basladi" });
  }

  const mapping: CustomFeedConfig["mapping"] = {};
  for (const f of CUSTOM_FIELD_LABELS) {
    const v = text(form, `field_${f.key}`);
    if (v) mapping[f.key] = v.slice(0, 200);
  }
  const currency = text(form, "currency");
  const margin = text(form, "margin");
  const next: CustomFeedConfig = {
    ...cfg,
    mapping,
    currency: currency === "USD" || currency === "EUR" || currency === "field" ? currency : "TRY",
    currencyField: text(form, "currencyField").slice(0, 200),
    vat: text(form, "vat") === "excl" ? "excl" : "incl",
    vatRate: clampNum(text(form, "vatRate"), 0, 50, 20),
    margin: margin === "fixed" || margin === "none" ? margin : "tiers",
    marginPct: clampNum(text(form, "marginPct"), -50, 500, 0),
    defaultStock: Math.round(clampNum(text(form, "defaultStock"), 0, 1000, 0)),
  };
  if (!mappingIsComplete(next)) return redirectTo(request, back, { hata: "Stok kodu, ürün adı ve fiyat alanları eşleştirilmeli." });
  if (next.currency === "field" && !next.currencyField) return redirectTo(request, back, { hata: "Para birimi alanını seçin." });
  const activate = form.get("activate") === "1";
  await db
    .update(xmlFeeds)
    .set({ mapping: feedRowMapping(next), ...(activate ? { isActive: 1 } : {}) })
    .where(eq(xmlFeeds.id, id));
  await audit("update", { mapping: feedRowMapping(next), activated: activate });
  if (activate && form.get("runNow") === "1") {
    const result = startServerSync({ trigger: `panel:${session.user.email}`, feedId: id });
    if (!result.ok) return redirectTo(request, back, { ok: "kaydedildi", hata: result.error });
    return redirectTo(request, back, { ok: "basladi" });
  }
  return redirectTo(request, back, { ok: "kaydedildi" });
}
