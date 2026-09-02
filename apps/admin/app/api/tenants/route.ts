import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { compileVisibility, db, tenantBankAccounts, tenantCatalogRules, tenantDomains, tenantSettings, tenants } from "@guntan/db";
import { DEFAULT_THEME_TOKENS } from "@guntan/types";
import { writeAudit } from "@guntan/observability";
import { CATALOG_RULE_KIND } from "@guntan/types";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const name = String(form.get("name"));
  const slug = String(form.get("slug"));
  const hostname = String(form.get("hostname")).toLowerCase();
  const visibilityMode = String(form.get("visibilityMode") ?? "GROUPS");
  const [tenant] = await db.insert(tenants).values({
    name,
    slug,
    status: "active",
    visibilityMode,
  }).returning();
  await db.insert(tenantDomains).values({ tenantId: tenant!.id, hostname, isPrimary: true });
  await db.insert(tenantSettings).values({
    tenantId: tenant!.id,
    siteName: name,
    phone: String(form.get("phone") ?? ""),
    whatsapp: String(form.get("whatsapp") ?? ""),
    email: String(form.get("email") ?? "") || null,
    defaultMetaTitle: String(form.get("defaultMetaTitle") ?? name),
    defaultMetaDescription: String(form.get("defaultMetaDescription") ?? ""),
    themeTokens: {
      ...DEFAULT_THEME_TOKENS,
      primary: String(form.get("primary") || DEFAULT_THEME_TOKENS.primary),
      secondary: String(form.get("secondary") || DEFAULT_THEME_TOKENS.secondary),
    },
  });
  const groupIds = form.getAll("groupIds").map(String);
  if (groupIds.length) {
    await db.insert(tenantCatalogRules).values(
      groupIds.map((targetId) => ({ tenantId: tenant!.id, kind: CATALOG_RULE_KIND.INCLUDE_GROUP, targetId })),
    );
  }
  const iban = String(form.get("iban") ?? "");
  if (iban) {
    await db.insert(tenantBankAccounts).values({
      tenantId: tenant!.id,
      bankName: String(form.get("bankName") ?? "Banka"),
      accountHolder: String(form.get("accountHolder") ?? name),
      iban,
    });
  }
  await compileVisibility(db, tenant!.id);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "tenant",
    entityId: tenant!.id,
    action: "create",
    after: { name, hostname, visibilityMode },
  });
  return NextResponse.redirect(new URL(`/tenants/${tenant!.id}`, request.url), 303);
}
