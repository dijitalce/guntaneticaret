import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, getCoupon, orders, tenants } from "@guntan/db";
import { orderStatusLabel } from "@guntan/ecommerce";
import { CouponForm, couponValueText } from "@/src/coupon-form";
import { ConfirmButton } from "@/src/form-fields";
import { IconTrash } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate, formatTry, statusTone } from "@/src/ui";
import { StatRow } from "@/src/ui-ext";

export const metadata = { title: "Kupon" };
export const dynamic = "force-dynamic";

export default async function CouponPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; hata?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const coupon = await getCoupon(id);
  if (!coupon) notFound();
  const where = and(eq(orders.tenantId, coupon.tenant_id), sql`upper(${orders.couponCode}) = ${coupon.code.toUpperCase()}`);
  const [tenant, recent, totals] = await Promise.all([
    db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, coupon.tenant_id)).limit(1).then((r) => r[0]),
    db
      .select({ id: orders.id, orderNo: orders.orderNo, fullName: orders.fullName, grandTotal: orders.grandTotal, discountTotal: orders.discountTotal, status: orders.status, createdAt: orders.createdAt })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(30),
    db
      .select({ c: sql<number>`count(*)`, s: sql<string>`coalesce(sum(${orders.grandTotal}), 0)`, d: sql<string>`coalesce(sum(${orders.discountTotal}), 0)` })
      .from(orders)
      .where(and(where, sql`${orders.status} not in ('cancelled','refunded')`)),
  ]);
  const t = totals[0];

  return (
    <>
      <PageHeader
        title={coupon.code}
        description={`${couponValueText(coupon.type, coupon.value)} · ${tenant?.name ?? "—"}`}
        crumbs={[{ href: "/marketing/coupons", label: "Kuponlar" }]}
        actions={<StatusBadge tone={Number(coupon.is_active) ? "ok" : "neutral"}>{Number(coupon.is_active) ? "Aktif" : "Kapalı"}</StatusBadge>}
      />
      {sp.ok === "olusturuldu" ? <Alert tone="ok">Kupon oluşturuldu. Müşteriler ödeme sayfasında bu kodu kullanabilir.</Alert> : null}
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Kaydedildi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <Panel padded>
        <StatRow
          items={[
            { label: "Kullanım", value: `${Number(coupon.used_count)}${coupon.usage_limit != null ? ` / ${coupon.usage_limit}` : ""}` },
            { label: "Sipariş", value: Number(t?.c ?? 0) },
            { label: "Ciro", value: formatTry(t?.s ?? 0) },
            { label: "Verilen indirim", value: formatTry(t?.d ?? 0) },
          ]}
        />
      </Panel>
      <div className="grid-2">
        <div>
          <Panel title="Kupon ayarları" padded>
            <CouponForm coupon={coupon} />
          </Panel>
          <Panel padded>
            <form action={withBase(`/api/coupons/${id}`)} method="post" className="danger-zone">
              <input type="hidden" name="_action" value="delete" />
              <div>
                <strong>Kuponu sil</strong>
                <small>Geçmiş siparişlerdeki kupon bilgisi korunur.</small>
              </div>
              <ConfirmButton className="btn btn-danger btn-sm" message="Kupon silinsin mi?">
                <IconTrash />
                Sil
              </ConfirmButton>
            </form>
          </Panel>
        </div>
        <div>
          <Panel title="Bu kuponla verilen siparişler">
            {recent.length === 0 ? (
              <EmptyState title="Henüz kullanılmadı" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/orders/${o.id}`}>{o.orderNo}</Link>
                          <div className="muted text-sm">
                            {o.fullName} · {formatDate(o.createdAt)}
                          </div>
                        </td>
                        <td>
                          {formatTry(o.grandTotal)}
                          <div className="muted text-sm">−{formatTry(o.discountTotal)}</div>
                        </td>
                        <td>
                          <StatusBadge tone={statusTone(o.status)}>{orderStatusLabel(o.status)}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
