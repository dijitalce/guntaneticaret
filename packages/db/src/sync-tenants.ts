import { and, eq } from "drizzle-orm";
import { DEFAULT_THEME_TOKENS } from "@guntan/types";
import { db, pg } from "./client";
import {
  brandGroups,
  tenantBankAccounts,
  tenantCatalogRules,
  tenantDomains,
  tenantSettings,
  tenants,
} from "./schema";
import { compileVisibility } from "./compile-visibility";
import { ALL_CATALOG_URL, ALL_SITE, GROUP_SITES, siteHosts } from "./group-sites";

type SiteDef = {
  slug: string;
  name: string;
  email: string;
  productionHost: string;
  localHosts: readonly string[];
  visibilityMode: "ALL" | "GROUPS";
  groupSlug?: string;
};

async function ensureTenant(site: SiteDef) {
  let [tenant] = await db.select().from(tenants).where(eq(tenants.slug, site.slug)).limit(1);
  if (!tenant) {
    const [created] = await db.insert(tenants).values({
      name: site.name,
      slug: site.slug,
      status: "active",
      visibilityMode: site.visibilityMode,
    }).returning();
    tenant = created!;
  } else {
    await db.update(tenants).set({
      name: site.name,
      status: "active",
      visibilityMode: site.visibilityMode,
    }).where(eq(tenants.id, tenant.id));
  }
  return tenant;
}

async function ensureHosts(tenantId: string, productionHost: string, aliases: readonly string[]) {
  const existing = await db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, tenantId));
  const have = new Set(existing.map((h) => h.hostname));
  for (const hostname of [productionHost, ...aliases]) {
    if (have.has(hostname)) continue;
    await db.insert(tenantDomains).values({
      tenantId,
      hostname,
      isPrimary: hostname === productionHost,
    });
  }
  await db.update(tenantDomains).set({ isPrimary: false }).where(eq(tenantDomains.tenantId, tenantId));
  await db.update(tenantDomains).set({ isPrimary: true }).where(
    and(eq(tenantDomains.tenantId, tenantId), eq(tenantDomains.hostname, productionHost)),
  );
}

async function ensureSettings(tenantId: string, site: SiteDef) {
  const [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1);
  const payload = {
    siteName: site.name,
    phone: "0216 000 00 00",
    whatsapp: "905550000000",
    email: site.email,
    address: "İstanbul",
    themeTokens: { ...DEFAULT_THEME_TOKENS },
    defaultMetaTitle: site.name,
    defaultMetaDescription: `${site.name} için oto yedek parça.`,
    seoContent: `${site.name} yedek parça kataloğu.`,
    logoUrl: "/brand/logo.png",
    faviconUrl: "/favicon.png",
    placeholderImageUrl: "/placeholder-product.jpg",
    ogImageUrl: "/brand/mark.png",
    socialJson: { allCatalogUrl: ALL_CATALOG_URL },
  };
  if (settings) await db.update(tenantSettings).set(payload).where(eq(tenantSettings.id, settings.id));
  else await db.insert(tenantSettings).values({ tenantId, ...payload });
}

async function ensureBank(tenantId: string, accountHolder: string) {
  const [bank] = await db.select().from(tenantBankAccounts).where(eq(tenantBankAccounts.tenantId, tenantId)).limit(1);
  if (bank) return;
  await db.insert(tenantBankAccounts).values({
    tenantId,
    bankName: "Ziraat Bankası",
    accountHolder,
    iban: "TR00 0000 0000 0000 0000 0000 00",
  });
}

async function main() {
  const allSite: SiteDef = {
    ...ALL_SITE,
    visibilityMode: "ALL",
  };
  const guntan = await ensureTenant(allSite);
  await ensureHosts(guntan.id, ALL_SITE.productionHost, ALL_SITE.localHosts);
  await ensureSettings(guntan.id, allSite);
  await ensureBank(guntan.id, ALL_SITE.name);

  for (const site of GROUP_SITES) {
    const [group] = await db.select().from(brandGroups).where(eq(brandGroups.slug, site.groupSlug)).limit(1);
    if (!group) throw new Error(`Grup yok: ${site.groupSlug}. Önce db:sync-catalog çalıştır.`);

    const def: SiteDef = { ...site, visibilityMode: "GROUPS" };
    const tenant = await ensureTenant(def);
    await ensureHosts(tenant.id, site.productionHost, site.localHosts);
    await ensureSettings(tenant.id, def);
    await ensureBank(tenant.id, site.name);

    const [rule] = await db
      .select()
      .from(tenantCatalogRules)
      .where(and(eq(tenantCatalogRules.tenantId, tenant.id), eq(tenantCatalogRules.targetId, group.id)))
      .limit(1);
    if (!rule) {
      await db.insert(tenantCatalogRules).values({
        tenantId: tenant.id,
        kind: "include_group",
        targetId: group.id,
      });
    }
  }

  await compileVisibility(db);
  console.log(`Synced ALL catalog ${ALL_SITE.productionHost} + ${GROUP_SITES.length} parked group domains.`);
  for (const site of [ALL_SITE, ...GROUP_SITES]) {
    console.log(`  ${site.productionHost}  (${siteHosts(site).slice(1).join(", ") || "no aliases"})`);
  }
  await pg.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
