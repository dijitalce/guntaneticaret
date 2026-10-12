import { createPaymentLink } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../src/api-helpers";

/** "1.000", "1.000,50", "1000.50", "1000 ₺" → sayı */
function parseAmount(raw: string): number {
  let s = raw.replace(/[\s₺]|TL/gi, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const fail = (hata: string) => redirectTo(request, "/payment-links", { hata });

  const tenantId = text(form, "tenant_id");
  const title = text(form, "title").slice(0, 191);
  const amount = parseAmount(text(form, "amount"));
  const customerEmail = text(form, "customer_email").slice(0, 191);
  if (!tenantId) return fail("Site seçin.");
  if (!title) return fail("Başlık girin.");
  if (!(amount >= 1) || amount > 10_000_000) return fail("Geçerli bir tutar girin (en az 1 ₺).");
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return fail("E-posta adresi geçersiz.");

  const link = await createPaymentLink({
    tenantId,
    title,
    amount,
    description: text(form, "description").slice(0, 2000),
    customerName: text(form, "customer_name").slice(0, 191),
    customerEmail,
    customerPhone: text(form, "customer_phone").slice(0, 32),
    createdBy: session.user.email,
  });
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "payment_link",
    entityId: link.id,
    action: "create",
    after: { title, amount, code: link.code },
  });
  return redirectTo(request, "/payment-links", { yeni: link.id });
}
