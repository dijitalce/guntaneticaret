import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { compileVisibility, db, tenantCatalogRules, tenantSettings, tenants } from "@guntan/db";
import { CATALOG_RULE_KIND, DEFAULT_THEME_TOKENS } from "@guntan/types";
import { invalidateTenantCache } from "@guntan/tenant";
import { db as database, tenantDomains } from "@guntan/db";
import { writeAudit } from "@guntan/observability";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(new URL("/login", request.url), 303);
  const { id } = await ctx.params;
  const form = await request.formData();
  const [before] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  await db.update(tenants).set({
    name: String(form.get("name")),
    status: String(form.get("status")),
    visibilityMode: String(form.get("visibilityMode")),
  }).where(eq(tenants.id, id));
  const [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, id)).limit(1);
  if (settings) {
    await db.update(tenantSettings).set({
      logoUrl: String(form.get("logoUrl") ?? "") || null,
      phone: String(form.get("phone") ?? "") || null,
      themeTokens: {
        ...DEFAULT_THEME_TOKENS,
        ...(settings.themeTokens as object),
        primary: String(form.get("primary") || DEFAULT_THEME_TOKENS.primary),
      },
    }).where(eq(tenantSettings.id, settings.id));
  }
  await db.delete(tenantCatalogRules).where(eq(tenantCatalogRules.tenantId, id));
  const groupIds = form.getAll("groupIds").map(String);
  if (groupIds.length) {
    await db.insert(tenantCatalogRules).values(
      groupIds.map((targetId) => ({ tenantId: id, kind: CATALOG_RULE_KIND.INCLUDE_GROUP, targetId })),
    );
  }
  const excludeBrandIds = form.getAll("excludeBrandIds").map(String);
  if (excludeBrandIds.length) {
    await db.insert(tenantCatalogRules).values(
      excludeBrandIds.map((targetId) => ({ tenantId: id, kind: CATALOG_RULE_KIND.EXCLUDE_BRAND, targetId })),
    );
  }
  await compileVisibility(db, id);
  const domains = await database.select().from(tenantDomains).where(eq(tenantDomains.tenantId, id));
  await invalidateTenantCache(id, domains.map((d) => d.hostname));
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "tenant",
    entityId: id,
    action: "update",
    before,
    after: { visibilityMode: form.get("visibilityMode") },
  });
  return NextResponse.redirect(new URL(`/tenants/${id}`, request.url), 303);
}
