import { randomInt, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, num, rows } from "./sql";

export const PAYMENT_LINK_STATUS = { PENDING: "pending", PAID: "paid", CANCELLED: "cancelled" } as const;
export type PaymentLinkStatus = (typeof PAYMENT_LINK_STATUS)[keyof typeof PAYMENT_LINK_STATUS];

/** Bankaya giden sipariş numarası `TH-<kod>-<deneme>`; aynı geri dönüş adresinde siparişlerden bu önekle ayrılır. */
export const PAYMENT_LINK_ORDER_PREFIX = "TH-";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type PaymentLink = {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  description: string | null;
  amount: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: PaymentLinkStatus;
  attempts: number;
  pending_order_id: string | null;
  pending_amount: string | null;
  pending_installment: number | null;
  last_error: string | null;
  paid_amount: string | null;
  paid_installment: number | null;
  payer_name: string | null;
  payer_email: string | null;
  payer_phone: string | null;
  /** JSON, bkz. PaymentLinkBilling; ödeyen fatura bilgisi girmediyse null. */
  payer_billing: string | null;
  bank_ref: string | null;
  paid_order_id: string | null;
  paid_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type PaymentLinkBilling = {
  invoiceType: "individual" | "corporate";
  nationalId?: string;
  companyName?: string;
  taxOffice?: string;
  taxNumber?: string;
  city: string;
  district: string;
  line1: string;
  postalCode?: string;
};

export function paymentLinkBilling(link: Pick<PaymentLink, "payer_billing">): PaymentLinkBilling | null {
  if (!link.payer_billing) return null;
  try {
    const v = JSON.parse(link.payer_billing) as PaymentLinkBilling;
    return v && typeof v === "object" && (v.invoiceType === "individual" || v.invoiceType === "corporate") ? v : null;
  } catch {
    return null;
  }
}

function newCode() {
  let code = "";
  for (let i = 0; i < 10; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export function paymentLinkCodeFromOrderId(orderId: string): string | null {
  const m = /^TH-([A-Z0-9]+)-\d+$/.exec(orderId);
  return m ? m[1]! : null;
}

export async function createPaymentLink(input: {
  tenantId: string;
  title: string;
  amount: number;
  description?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  createdBy?: string | null;
}): Promise<PaymentLink> {
  await ensureExtTables();
  const id = randomUUID();
  for (let attempt = 0; ; attempt++) {
    try {
      await exec(sql`insert into payment_links (id, tenant_id, code, title, description, amount, customer_name, customer_email, customer_phone, created_by)
        values (${id}, ${input.tenantId}, ${newCode()}, ${input.title}, ${input.description || null}, ${input.amount.toFixed(2)},
          ${input.customerName || null}, ${input.customerEmail || null}, ${input.customerPhone || null}, ${input.createdBy || null})`);
      break;
    } catch (err) {
      const e = err as { code?: string; cause?: { code?: string } };
      if (attempt >= 3 || (e?.code !== "ER_DUP_ENTRY" && e?.cause?.code !== "ER_DUP_ENTRY")) throw err;
    }
  }
  return (await getPaymentLink(id))!;
}

export async function getPaymentLink(id: string) {
  await ensureExtTables();
  return first<PaymentLink>(sql`select * from payment_links where id = ${id} limit 1`);
}

export async function getPaymentLinkByCode(code: string) {
  await ensureExtTables();
  if (!/^[A-Z0-9]{4,32}$/.test(code)) return null;
  return first<PaymentLink>(sql`select * from payment_links where code = ${code} limit 1`);
}

export async function listPaymentLinks(status: PaymentLinkStatus | "all" = "all", limit = 200) {
  await ensureExtTables();
  const where = status === "all" ? sql`` : sql`where status = ${status}`;
  return rows<PaymentLink>(sql`select * from payment_links ${where} order by created_at desc limit ${limit}`);
}

export async function paymentLinkStats() {
  await ensureExtTables();
  const list = await rows<{ status: string; c: number; s: string; p: string }>(
    sql`select status, count(*) c, sum(amount) s, sum(coalesce(paid_amount, 0)) p from payment_links group by status`,
  );
  const by = (s: string) => list.find((r) => r.status === s);
  return {
    pending: num(by("pending")?.c),
    pendingAmount: num(by("pending")?.s),
    paid: num(by("paid")?.c),
    paidAmount: num(by("paid")?.p),
    cancelled: num(by("cancelled")?.c),
    all: list.reduce((n, r) => n + num(r.c), 0),
  };
}

export async function cancelPaymentLink(id: string) {
  await ensureExtTables();
  const res = await exec(sql`update payment_links set status = 'cancelled' where id = ${id} and status = 'pending'`);
  return res.affectedRows === 1;
}

export async function reopenPaymentLink(id: string) {
  await ensureExtTables();
  const res = await exec(sql`update payment_links set status = 'pending' where id = ${id} and status = 'cancelled'`);
  return res.affectedRows === 1;
}

export async function deletePaymentLink(id: string) {
  await ensureExtTables();
  const res = await exec(sql`delete from payment_links where id = ${id} and status <> 'paid'`);
  return res.affectedRows === 1;
}

/** Her kart denemesi bankaya yeni bir sipariş numarasıyla gider; Garanti aynı numarayla ikinci denemeyi reddeder. */
export async function startPaymentLinkAttempt(
  code: string,
  input: {
    amount: number;
    installment: number;
    payerName: string;
    payerEmail: string;
    payerPhone: string;
    billing?: PaymentLinkBilling | null;
  },
): Promise<string> {
  await ensureExtTables();
  const res = await exec(sql`update payment_links set attempts = attempts + 1,
      pending_amount = ${input.amount.toFixed(2)}, pending_installment = ${input.installment},
      payer_name = ${input.payerName}, payer_email = ${input.payerEmail}, payer_phone = ${input.payerPhone || null},
      payer_billing = ${input.billing ? JSON.stringify(input.billing) : null},
      pending_order_id = concat(${PAYMENT_LINK_ORDER_PREFIX}, code, '-', attempts)
    where code = ${code} and status = 'pending'`);
  if (res.affectedRows !== 1) throw new Error("Bu ödeme bağlantısı artık geçerli değil.");
  const row = await first<{ pending_order_id: string }>(sql`select pending_order_id from payment_links where code = ${code} limit 1`);
  return row!.pending_order_id;
}

export async function confirmPaymentLink(
  orderId: string,
  input: { amountKurus: string; authCode?: string; hostRef?: string },
): Promise<{ link: PaymentLink; alreadyPaid: boolean }> {
  const code = paymentLinkCodeFromOrderId(orderId);
  const link = code ? await getPaymentLinkByCode(code) : null;
  if (!link) throw new Error("Ödeme bağlantısı bulunamadı.");
  if (link.status === PAYMENT_LINK_STATUS.PAID) return { link, alreadyPaid: true };

  const paidKurus = Number(input.amountKurus);
  // Eski bir denemenin geç gelen onayında vade farkı bilinmez; en az bağlantı tutarı ödenmiş olmalı.
  const strict = link.pending_order_id === orderId && link.pending_amount != null;
  const expectedKurus = Math.round(Number(strict ? link.pending_amount : link.amount) * 100);
  if (!Number.isFinite(paidKurus) || (strict ? paidKurus !== expectedKurus : paidKurus < expectedKurus)) {
    throw new Error("Ödenen tutar tahsilat tutarıyla eşleşmiyor.");
  }

  const ref = [input.hostRef, input.authCode].filter(Boolean).join("/") || null;
  const installment = strict ? link.pending_installment : null;
  // Bağlantı sonradan iptal edilmiş olsa bile banka parayı çekmişse ödeme kaydedilir.
  const res = await exec(sql`update payment_links set status = 'paid', paid_amount = ${(paidKurus / 100).toFixed(2)},
      paid_installment = ${installment}, bank_ref = ${ref}, paid_order_id = ${orderId}, paid_at = current_timestamp, last_error = null
    where id = ${link.id} and status <> 'paid'`);
  return { link: (await getPaymentLink(link.id))!, alreadyPaid: res.affectedRows !== 1 };
}

export async function failPaymentLink(orderId: string, reason: string) {
  const code = paymentLinkCodeFromOrderId(orderId);
  if (!code) return;
  await ensureExtTables();
  await exec(sql`update payment_links set last_error = ${reason.slice(0, 255)} where code = ${code} and status = 'pending'`);
}
