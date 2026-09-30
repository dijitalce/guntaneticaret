import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, parseJson, rows } from "./sql";

export const ADMIN_ROLES: { key: string; label: string; description: string }[] = [
  { key: "owner", label: "Sahip", description: "Tüm yetkiler, kullanıcı yönetimi dahil." },
  { key: "admin", label: "Yönetici", description: "Tüm modüller, kullanıcı yönetimi dahil." },
  { key: "editor", label: "Editör", description: "Katalog, içerik ve pazarlama." },
  { key: "support", label: "Destek / Operasyon", description: "Siparişler ve müşteriler." },
];

export type AdminMeta = { role: string; phone: string | null; title: string | null; last_login_at: Date | null; last_login_ip: string | null };

export async function getAdminMeta(adminUserId: string): Promise<AdminMeta> {
  await ensureExtTables();
  const row = await first<AdminMeta>(sql`select role, phone, title, last_login_at, last_login_ip from admin_user_meta where admin_user_id = ${adminUserId}`);
  return row ?? { role: "admin", phone: null, title: null, last_login_at: null, last_login_ip: null };
}

export async function listAdminMeta(): Promise<Map<string, AdminMeta>> {
  await ensureExtTables();
  const list = await rows<AdminMeta & { admin_user_id: string }>(sql`select * from admin_user_meta`);
  return new Map(list.map((r) => [r.admin_user_id, r]));
}

export async function saveAdminMeta(adminUserId: string, meta: { role: string; phone: string | null; title: string | null }) {
  await ensureExtTables();
  await exec(sql`insert into admin_user_meta (admin_user_id, role, phone, title) values (${adminUserId}, ${meta.role}, ${meta.phone}, ${meta.title})
    on duplicate key update role = values(role), phone = values(phone), title = values(title)`);
}

export async function recordAdminLogin(adminUserId: string, ip: string | null) {
  await ensureExtTables();
  await exec(sql`insert into admin_user_meta (admin_user_id, last_login_at, last_login_ip) values (${adminUserId}, now(), ${ip})
    on duplicate key update last_login_at = now(), last_login_ip = values(last_login_ip)`);
}

export type CustomerMeta = { tags: string[]; note: string | null; is_blocked: boolean };

export async function getCustomerMeta(customerId: string): Promise<CustomerMeta> {
  await ensureExtTables();
  const row = await first<{ tags: unknown; note: string | null; is_blocked: number }>(
    sql`select tags, note, is_blocked from customer_meta where customer_id = ${customerId}`,
  );
  return { tags: parseJson<string[]>(row?.tags, []), note: row?.note ?? null, is_blocked: Boolean(row?.is_blocked) };
}

export async function saveCustomerMeta(customerId: string, meta: CustomerMeta) {
  await ensureExtTables();
  await exec(sql`insert into customer_meta (customer_id, tags, note, is_blocked) values (${customerId}, ${JSON.stringify(meta.tags)}, ${meta.note}, ${meta.is_blocked ? 1 : 0})
    on duplicate key update tags = values(tags), note = values(note), is_blocked = values(is_blocked)`);
}

export type CustomerListRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  invoice_type: string | null;
  created_at: Date;
  orders: number;
  spent: string | null;
  last_order_at: Date | null;
  tags: unknown;
  is_blocked: number | null;
};

export async function listCustomers(opts: {
  q?: string;
  filter?: string;
  sort?: string;
  limit: number;
  offset: number;
}) {
  await ensureExtTables();
  const q = opts.q?.trim() ? `%${opts.q.trim()}%` : null;
  const where = sql`where 1 = 1
    ${q ? sql`and (c.email like ${q} or c.first_name like ${q} or c.last_name like ${q} or concat(c.first_name, ' ', c.last_name) like ${q} or c.phone like ${q})` : sql``}
    ${opts.filter === "buyers" ? sql`and s.orders > 0` : sql``}
    ${opts.filter === "no_orders" ? sql`and coalesce(s.orders, 0) = 0` : sql``}
    ${opts.filter === "corporate" ? sql`and c.invoice_type = 'corporate'` : sql``}
    ${opts.filter === "blocked" ? sql`and m.is_blocked = 1` : sql``}
    ${opts.filter === "new" ? sql`and c.created_at > now() - interval 30 day` : sql``}`;
  const order =
    opts.sort === "spent"
      ? sql`order by coalesce(s.spent, 0) desc`
      : opts.sort === "orders"
        ? sql`order by coalesce(s.orders, 0) desc`
        : opts.sort === "last_order"
          ? sql`order by s.last_order_at is null, s.last_order_at desc`
          : sql`order by c.created_at desc`;
  const from = sql`from customers c
    left join (select customer_id, count(*) orders, sum(grand_total) spent, max(created_at) last_order_at from orders
      where customer_id is not null and status not in ('cancelled','refunded') group by customer_id) s on s.customer_id = c.id
    left join customer_meta m on m.customer_id = c.id`;
  const list = await rows<CustomerListRow>(sql`select c.id, c.email, c.first_name, c.last_name, c.phone, c.invoice_type, c.created_at,
      coalesce(s.orders, 0) orders, s.spent, s.last_order_at, m.tags, m.is_blocked
    ${from} ${where} ${order} limit ${opts.limit} offset ${opts.offset}`);
  const [count] = await rows<{ c: number }>(sql`select count(*) c ${from} ${where}`);
  return { rows: list.map((r) => ({ ...r, tags: parseJson<string[]>(r.tags, []) })), total: Number(count?.c ?? 0) };
}

export async function customerKpis() {
  await ensureExtTables();
  const [row] = await rows<{ total: number; new30: number; buyers: number; repeat: number }>(sql`select
    (select count(*) from customers) total,
    (select count(*) from customers where created_at > now() - interval 30 day) new30,
    (select count(distinct customer_id) from orders where customer_id is not null and status not in ('cancelled','refunded')) buyers,
    (select count(*) from (select customer_id from orders where customer_id is not null and status not in ('cancelled','refunded') group by customer_id having count(*) > 1) x) repeat`);
  return { total: Number(row?.total ?? 0), new30: Number(row?.new30 ?? 0), buyers: Number(row?.buyers ?? 0), repeat: Number(row?.repeat ?? 0) };
}
