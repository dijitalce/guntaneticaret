import { eq } from "drizzle-orm";
import { db, getIntegrationSecrets, saveIntegrationSecrets, tenantSettings } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../src/api-helpers";
import { mergeSocial, refreshTenantCache } from "../../../src/tenant-form";

const MASK = "••••••••";
const ID = /^[A-Za-z0-9_\-/.]*$/;

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const tenantId = text(form, "tenantId");
  const back = `/integrations?site=${tenantId}`;
  const [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1);
  if (!settings) return redirectTo(request, "/integrations", { hata: "Site ayarları bulunamadı." });

  const clean = (key: string, max = 64) => {
    const v = text(form, key).replace(/\s+/g, "").slice(0, max);
    return ID.test(v) ? v : "";
  };
  const gaId = clean("gaId").toUpperCase();
  const gtmId = clean("gtmId").toUpperCase();
  if (gaId && !/^G-[A-Z0-9]{4,}$/.test(gaId)) return redirectTo(request, back, { hata: "GA4 ölçüm kimliği G-XXXXXXX biçiminde olmalı." });
  if (gtmId && !/^GTM-[A-Z0-9]{4,}$/.test(gtmId)) return redirectTo(request, back, { hata: "GTM kimliği GTM-XXXXXX biçiminde olmalı." });
  const metaPixelId = clean("metaPixelId");
  if (metaPixelId && !/^\d{8,20}$/.test(metaPixelId)) return redirectTo(request, back, { hata: "Meta Pixel ID yalnızca rakamlardan oluşmalı." });
  const googleAdsId = clean("googleAdsId").toUpperCase();
  if (googleAdsId && !/^AW-\d{6,}$/.test(googleAdsId)) return redirectTo(request, back, { hata: "Google Ads kimliği AW-XXXXXXXXX biçiminde olmalı." });

  const verification = text(form, "googleVerification").replace(/.*content="([^"]+)".*/, "$1").trim().slice(0, 200);
  const bing = text(form, "bingVerification").replace(/.*content="([^"]+)".*/, "$1").trim().slice(0, 200);
  const social = mergeSocial(settings.socialJson, {
    metaPixelId,
    tiktokPixelId: clean("tiktokPixelId").toUpperCase(),
    googleAdsId,
    googleAdsLabel: clean("googleAdsLabel", 100),
    merchantFeed: form.get("merchantFeed") === "1" ? "1" : "",
    metaFeed: form.get("metaFeed") === "1" ? "1" : "",
    chatgptFeed: form.get("chatgptFeed") === "1" ? "1" : "",
    tiktokFeed: form.get("tiktokFeed") === "1" ? "1" : "",
    pinterestFeed: form.get("pinterestFeed") === "1" ? "1" : "",
    bingFeed: form.get("bingFeed") === "1" ? "1" : "",
    feedAllProducts: form.get("feedAllProducts") === "1" ? "1" : "",
    googleVerification: verification,
    bingVerification: bing,
  });
  await db.update(tenantSettings).set({ gaId: gaId || null, gtmId: gtmId || null, socialJson: social }).where(eq(tenantSettings.tenantId, tenantId));

  const secrets = await getIntegrationSecrets(tenantId);
  const secret = (key: string, current: string) => {
    const v = text(form, key);
    if (!v) return "";
    return v === MASK ? current : v.slice(0, 500);
  };
  const nextSecrets = {
    metaCapiToken: secret("metaCapiToken", secrets.metaCapiToken),
    metaTestCode: text(form, "metaTestCode").slice(0, 40),
    ga4ApiSecret: secret("ga4ApiSecret", secrets.ga4ApiSecret),
  };
  await saveIntegrationSecrets(tenantId, nextSecrets);
  await refreshTenantCache(tenantId).catch(() => undefined);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "integration",
    entityId: tenantId,
    action: "update",
    before: { gaId: settings.gaId, gtmId: settings.gtmId, social: settings.socialJson },
    after: { gaId, gtmId, social, metaCapi: Boolean(nextSecrets.metaCapiToken), ga4Mp: Boolean(nextSecrets.ga4ApiSecret) },
  });
  return redirectTo(request, back, { ok: "1" });
}
