import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { compileVisibility, db, newId, tenantBankAccounts, tenantCatalogRules, tenantDomains, tenantSettings, tenants } from "@guntan/db";
import { DEFAULT_THEME_TOKENS } from "@guntan/types";
import { writeAudit } from "@guntan/observability";
import { CATALOG_RULE_KIND } from "@guntan/types";
import { adminRedirect } from "../../../src/paths";

export async function POST(request: Request) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(adminRedirect("/login", request), 303);
  const form = await request.formData();
  const name = String(form.get("name"));
  const slug = String(form.get("slug"));
  const hostname = String(form.get("hostname")).toLowerCase();
  const visibilityMode = String(form.get("visibilityMode") ?? "GROUPS");
  const tenantId = newId();
  await db.insert(tenants).values({
    id: tenantId,
    name,
    slug,
    status: "active",
    visibilityMode,
  });
  await db.insert(tenantDomains).values({ tenantId, hostname, isPrimary: true });
  await db.insert(tenantSettings).values({
    tenantId,
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
      groupIds.map((targetId) => ({ tenantId, kind: CATALOG_RULE_KIND.INCLUDE_GROUP, targetId })),
    );
  }
  const iban = String(form.get("iban") ?? "");
  if (iban) {
    await db.insert(tenantBankAccounts).values({
      tenantId,
      bankName: String(form.get("bankName") ?? "Banka"),
      accountHolder: String(form.get("accountHolder") ?? name),
      iban,
    });
  }
  await compileVisibility(db, tenantId);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "tenant",
    entityId: tenantId,
    action: "create",
    after: { name, hostname, visibilityMode },
  });
  return NextResponse.redirect(adminRedirect(`/tenants/${tenantId}`, request), 303);
}
