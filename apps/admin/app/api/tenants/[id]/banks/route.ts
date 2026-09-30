import { and, eq } from "drizzle-orm";
import { db, tenantBankAccounts, tenants } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";
import { formatIban, isValidIban, normalizeIban } from "../../../../../src/tenant-seo";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const action = text(form, "_action");
  const done = (q: Record<string, string>) => redirectTo(request, `/tenants/${id}`, { sekme: "banka", ...q });

  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) return redirectTo(request, "/tenants", { hata: "Site bulunamadı." });
  const audit = (act: string, data: Record<string, unknown>) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "tenant_bank", entityId: id, action: act, after: data });

  if (action === "add") {
    const bankName = text(form, "bankName");
    const accountHolder = text(form, "accountHolder");
    const iban = normalizeIban(text(form, "iban"));
    if (!bankName || !accountHolder) return done({ hata: "Banka adı ve hesap sahibi zorunlu." });
    if (!isValidIban(iban)) return done({ hata: "IBAN geçersiz. TR ile başlayan 26 karakterlik IBAN girin." });
    const existing = await db.select({ id: tenantBankAccounts.id }).from(tenantBankAccounts).where(eq(tenantBankAccounts.tenantId, id));
    await db.insert(tenantBankAccounts).values({ tenantId: id, bankName, accountHolder, iban: formatIban(iban), sortOrder: existing.length });
    await audit("create", { bankName, iban: formatIban(iban) });
    return done({ ok: "banka-eklendi" });
  }

  const bankId = text(form, "bankId");
  const [bank] = await db
    .select()
    .from(tenantBankAccounts)
    .where(and(eq(tenantBankAccounts.id, bankId), eq(tenantBankAccounts.tenantId, id)))
    .limit(1);
  if (!bank) return done({ hata: "Hesap bulunamadı." });

  if (action === "toggle") {
    await db.update(tenantBankAccounts).set({ isActive: !bank.isActive }).where(eq(tenantBankAccounts.id, bank.id));
    await audit("toggle", { bankName: bank.bankName, isActive: !bank.isActive });
    return done({ ok: "kaydedildi" });
  }
  if (action === "delete") {
    await db.delete(tenantBankAccounts).where(eq(tenantBankAccounts.id, bank.id));
    await audit("delete", { bankName: bank.bankName, iban: bank.iban });
    return done({ ok: "banka-silindi" });
  }
  return done({ hata: "Bilinmeyen işlem." });
}
