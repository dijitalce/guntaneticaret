import { eq, sql } from "drizzle-orm";
import { hashPassword } from "@guntan/auth";
import { carts, tagList, customerSessions, customers, db, ensureExtTables, getCustomerMeta, orders, saveCustomerMeta } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, text } from "../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const back = `/customers/${id}`;
  await ensureExtTables();
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) return redirectTo(request, "/customers", { hata: "Müşteri bulunamadı." });
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const audit = (act: string, before?: unknown, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "customer", entityId: id, action: act, before, after });

  if (action === "meta") {
    const before = await getCustomerMeta(id);
    const next = {
      tags: tagList(text(form, "tags")),
      note: text(form, "note") || null,
      is_blocked: form.get("blocked") === "1",
    };
    await saveCustomerMeta(id, next);
    if (next.is_blocked && !before.is_blocked) await db.delete(customerSessions).where(eq(customerSessions.customerId, id));
    await audit("update", before, next);
    return redirectTo(request, back, { ok: "etiket" });
  }

  if (action === "password") {
    const password = text(form, "password");
    if (password.length < 8) return redirectTo(request, back, { hata: "Şifre en az 8 karakter olmalı." });
    await db.update(customers).set({ passwordHash: hashPassword(password) }).where(eq(customers.id, id));
    await db.delete(customerSessions).where(eq(customerSessions.customerId, id));
    await audit("password_reset");
    return redirectTo(request, back, { ok: "sifre" });
  }

  if (action === "delete") {
    const [hasOrders] = await db
      .select({ c: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.customerId, id));
    const snapshot = { name: `${customer.firstName} ${customer.lastName}`, email: customer.email };
    if (Number(hasOrders?.c ?? 0) > 0) {
      await db
        .update(customers)
        .set({
          email: `silindi-${id.slice(0, 8)}@anonim.invalid`,
          firstName: "Silinmiş",
          lastName: "Müşteri",
          phone: null,
          passwordHash: hashPassword(crypto.randomUUID()),
          companyName: null,
          taxOffice: null,
          taxNumber: null,
          nationalId: null,
        })
        .where(eq(customers.id, id));
      await db.delete(customerSessions).where(eq(customerSessions.customerId, id));
      await db.execute(sql`delete from customer_addresses where customer_id = ${id}`);
      await db.execute(sql`delete from customer_vehicles where customer_id = ${id}`);
      await db.delete(carts).where(eq(carts.customerId, id));
      await audit("delete", snapshot, { anonymized: true });
      return redirectTo(request, "/customers", { ok: "anonim" });
    }
    await db.delete(carts).where(eq(carts.customerId, id));
    await db.execute(sql`delete from customer_meta where customer_id = ${id}`);
    await db.delete(customers).where(eq(customers.id, id));
    await audit("delete", snapshot);
    return redirectTo(request, "/customers", { ok: "silindi" });
  }

  const next = {
    firstName: text(form, "firstName"),
    lastName: text(form, "lastName"),
    email: text(form, "email").toLowerCase(),
    phone: text(form, "phone") || null,
    invoiceType: text(form, "invoiceType") === "corporate" ? "corporate" : "individual",
    companyName: text(form, "companyName") || null,
    taxOffice: text(form, "taxOffice") || null,
    taxNumber: text(form, "taxNumber") || null,
    nationalId: text(form, "nationalId") || null,
  };
  if (!next.firstName || !next.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) {
    return redirectTo(request, back, { hata: "Ad, soyad ve geçerli bir e-posta girin." });
  }
  try {
    await db.update(customers).set(next).where(eq(customers.id, id));
  } catch (err) {
    if (isDuplicateError(err)) return redirectTo(request, back, { hata: "Bu e-posta başka bir müşteride kayıtlı." });
    throw err;
  }
  const before = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    invoiceType: customer.invoiceType,
    companyName: customer.companyName,
    taxOffice: customer.taxOffice,
    taxNumber: customer.taxNumber,
    nationalId: customer.nationalId,
  };
  await audit("update", before, next);
  return redirectTo(request, back, { ok: "kaydedildi" });
}
