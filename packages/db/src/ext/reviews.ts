import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, num, rows } from "./sql";

export const REVIEW_STATUS = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" } as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

/** Teslim edilmiş ya da kargoya verilmiş siparişler; ürünü eline almamış müşteri değerlendiremez. */
const REVIEWABLE_ORDER_STATUSES = ["shipped", "completed"];

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  created_at: Date;
};

export type ReviewSummary = { count: number; average: number; distribution: [number, number, number, number, number] };

export type AdminReview = PublicReview & {
  status: ReviewStatus;
  product_id: string;
  product_name: string | null;
  product_slug: string | null;
  customer_email: string | null;
  order_no: string | null;
};

/** "Ahmet Yılmaz" → "Ahmet Y." */
export function reviewAuthorName(firstName: string, lastName: string) {
  const f = firstName.trim();
  const l = lastName.trim();
  if (!f) return "Müşteri";
  return l ? `${f} ${l.charAt(0).toLocaleUpperCase("tr-TR")}.` : f;
}

export async function reviewEligibility(customerId: string, productId: string) {
  await ensureExtTables();
  const order = await first<{ id: string }>(sql`select o.id from orders o
    join order_items oi on oi.order_id = o.id
    where o.customer_id = ${customerId} and oi.product_id = ${productId}
      and o.status in (${sql.join(REVIEWABLE_ORDER_STATUSES.map((s) => sql`${s}`), sql`, `)})
    order by o.created_at desc limit 1`);
  const existing = await first<{ id: string; rating: number; title: string | null; body: string; status: ReviewStatus }>(
    sql`select id, rating, title, body, status from product_reviews where product_id = ${productId} and customer_id = ${customerId} limit 1`,
  );
  return { orderId: order?.id ?? null, existing };
}

/** Aynı müşteri aynı ürüne ikinci kez yazarsa yorumu güncellenir ve yeniden onaya düşer. */
export async function submitReview(input: {
  tenantId: string;
  productId: string;
  customerId: string;
  orderId: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
}) {
  await ensureExtTables();
  await exec(sql`insert into product_reviews (id, tenant_id, product_id, customer_id, order_id, rating, title, body, author_name, status)
    values (${randomUUID()}, ${input.tenantId}, ${input.productId}, ${input.customerId}, ${input.orderId}, ${input.rating},
      ${input.title}, ${input.body}, ${input.authorName}, ${REVIEW_STATUS.PENDING})
    on duplicate key update rating = values(rating), title = values(title), body = values(body),
      author_name = values(author_name), order_id = values(order_id), status = ${REVIEW_STATUS.PENDING}`);
}

export async function productReviewSummary(productId: string): Promise<ReviewSummary> {
  await ensureExtTables();
  const list = await rows<{ rating: number; c: number }>(
    sql`select rating, count(*) c from product_reviews where product_id = ${productId} and status = ${REVIEW_STATUS.APPROVED} group by rating`,
  );
  const distribution: ReviewSummary["distribution"] = [0, 0, 0, 0, 0];
  let total = 0;
  let sum = 0;
  for (const r of list) {
    const rating = num(r.rating);
    const c = num(r.c);
    if (rating < 1 || rating > 5) continue;
    distribution[rating - 1] = (distribution[rating - 1] ?? 0) + c;
    total += c;
    sum += rating * c;
  }
  return { count: total, average: total ? Math.round((sum / total) * 10) / 10 : 0, distribution };
}

export async function listProductReviews(productId: string, limit = 20) {
  await ensureExtTables();
  return rows<PublicReview>(sql`select id, rating, title, body, author_name, created_at from product_reviews
    where product_id = ${productId} and status = ${REVIEW_STATUS.APPROVED}
    order by created_at desc limit ${limit}`);
}

export async function listReviewsForAdmin(status: ReviewStatus | "all", limit = 200) {
  await ensureExtTables();
  const where = status === "all" ? sql`1 = 1` : sql`r.status = ${status}`;
  return rows<AdminReview>(sql`select r.id, r.rating, r.title, r.body, r.author_name, r.created_at, r.status, r.product_id,
      p.name product_name, p.slug product_slug, c.email customer_email, o.order_no
    from product_reviews r
    left join products p on p.id = r.product_id
    left join customers c on c.id = r.customer_id
    left join orders o on o.id = r.order_id
    where ${where}
    order by r.created_at desc limit ${limit}`);
}

export async function reviewStatusCounts() {
  await ensureExtTables();
  const list = await rows<{ status: string; c: number }>(sql`select status, count(*) c from product_reviews group by status`);
  const counts: Record<ReviewStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const r of list) if (r.status in counts) counts[r.status as ReviewStatus] = num(r.c);
  return counts;
}

export async function getReview(id: string) {
  await ensureExtTables();
  return first<AdminReview>(sql`select r.id, r.rating, r.title, r.body, r.author_name, r.created_at, r.status, r.product_id,
      null product_name, null product_slug, null customer_email, null order_no
    from product_reviews r where r.id = ${id} limit 1`);
}

export async function setReviewStatus(id: string, status: ReviewStatus) {
  await ensureExtTables();
  await exec(sql`update product_reviews set status = ${status} where id = ${id}`);
}

export async function deleteReview(id: string) {
  await ensureExtTables();
  await exec(sql`delete from product_reviews where id = ${id}`);
}
