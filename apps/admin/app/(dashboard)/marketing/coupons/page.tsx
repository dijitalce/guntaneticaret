import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, extRows, listCoupons, tenants } from "@guntan/db";
import { IconPlus } from "@/src/icons";
import { couponValueText } from "@/src/coupon-form";
import { MarketingNav } from "@/src/marketing-nav";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate, formatTry } from "@/src/ui";

export const metadata = { title: "Kuponlar" };
export const dynamic = "force-dynamic";

export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ ok?: string; adet?: string; atlanan?: string }> }) {
  const sp = await searchParams;
  const [list, tenantRows, usage] = await Promise.all([
    listCoupons(),
    db.select({ id: tenants.id, name: tenants.name }).from(tenants),
    extRows<{ tenant_id: string; code: string; c: number; s: string; d: string }>(
      sql`select tenant_id, upper(coupon_code) code, count(*) c, sum(grand_total) s, sum(discount_total) d from orders
        where coupon_code is not null and status not in ('cancelled','refunded') group by tenant_id, upper(coupon_code)`,
    ),
  ]);
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));
  const usageBy = new Map(usage.map((u) => [`${u.tenant_id}:${u.code}`, u]));
  const now = Date.now();
  const totalRevenue = usage.reduce((s, u) => s + Number(u.s), 0);
  const totalDiscount = usage.reduce((s, u) => s + Number(u.d), 0);
  const activeCount = list.filter((c) => Number(c.is_active) && (!c.ends_at || new Date(c.ends_at).getTime() > now)).length;

  return (
    <>
      <PageHeader
        title="Kuponlar"
        description="İndirim kodları: yüzde, sabit tutar veya ücretsiz kargo; tarih, limit ve en az sepet tutarı ile."
        actions={
          <Link className="btn btn-primary" href="/marketing/coupons/new">
            <IconPlus />
            Yeni kupon
          </Link>
        }
      />
      <MarketingNav active="coupons" />
      {sp.ok === "silindi" ? <Alert tone="ok">Kupon silindi.</Alert> : null}
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Kaydedildi.</Alert> : null}
      {sp.ok === "coklu" ? (
        <Alert tone="ok">
          {sp.adet} sitede kupon oluşturuldu{Number(sp.atlanan) ? ` (${sp.atlanan} sitede bu kod zaten vardı)` : ""}.
        </Alert>
      ) : null}
      <div className="kpis">
        <Kpi label="Aktif kupon" value={activeCount} />
        <Kpi label="Kuponlu sipariş" value={usage.reduce((s, u) => s + Number(u.c), 0)} />
        <Kpi label="Kuponlu ciro" value={formatTry(totalRevenue)} tone="ok" />
        <Kpi label="Verilen indirim" value={formatTry(totalDiscount)} />
      </div>
      <Panel>
        {list.length === 0 ? (
          <EmptyState title="Henüz kupon yok" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>İndirim</th>
                  <th>Site</th>
                  <th>Kullanım</th>
                  <th>Ciro</th>
                  <th>Geçerlilik</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const u = usageBy.get(`${c.tenant_id}:${c.code.toUpperCase()}`);
                  const expired = c.ends_at && new Date(c.ends_at).getTime() < now;
                  const exhausted = c.usage_limit != null && Number(c.used_count) >= Number(c.usage_limit);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link className="mono" href={`/marketing/coupons/${c.id}`}>
                          <strong>{c.code}</strong>
                        </Link>
                        {c.description ? <div className="muted text-sm">{c.description}</div> : null}
                      </td>
                      <td>
                        {couponValueText(c.type, c.value)}
                        {c.min_subtotal && Number(c.min_subtotal) > 0 ? <div className="muted text-sm">En az {formatTry(c.min_subtotal)}</div> : null}
                      </td>
                      <td className="text-sm">{tenantName.get(c.tenant_id) ?? "—"}</td>
                      <td>
                        {Number(c.used_count)}
                        {c.usage_limit != null ? <span className="muted"> / {c.usage_limit}</span> : null}
                      </td>
                      <td>{u ? formatTry(u.s) : "—"}</td>
                      <td className="text-sm">
                        {c.starts_at || c.ends_at ? `${c.starts_at ? formatDate(c.starts_at, false) : "…"} – ${c.ends_at ? formatDate(c.ends_at, false) : "…"}` : "Süresiz"}
                      </td>
                      <td>
                        <form action={withBase(`/api/coupons/${c.id}`)} method="post">
                          <input type="hidden" name="_action" value="toggle" />
                          <button className="badge-button" type="submit" title="Durumu değiştir">
                            <StatusBadge tone={!Number(c.is_active) ? "neutral" : expired || exhausted ? "warn" : "ok"}>
                              {!Number(c.is_active) ? "Kapalı" : expired ? "Süresi doldu" : exhausted ? "Limit doldu" : "Aktif"}
                            </StatusBadge>
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
