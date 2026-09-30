import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, segmentSizes, tenants, type CustomSegment } from "@guntan/db";
import { ConfirmButton } from "@/src/form-fields";
import { IconTrash } from "@/src/icons";
import { MarketingNav } from "@/src/marketing-nav";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel, StatusBadge, formatTry } from "@/src/ui";

export const metadata = { title: "Segmentler" };
export const dynamic = "force-dynamic";

function rules(s: CustomSegment, tenantName: Map<string, string>) {
  const out: string[] = [];
  if (s.minOrders != null) out.push(`en az ${s.minOrders} sipariş`);
  if (s.maxOrders != null) out.push(`en fazla ${s.maxOrders} sipariş`);
  if (s.minSpent != null) out.push(`en az ${formatTry(s.minSpent)} harcama`);
  if (s.lastOrderWithinDays != null) out.push(`son ${s.lastOrderWithinDays} günde sipariş`);
  if (s.lastOrderOlderThanDays != null) out.push(`${s.lastOrderOlderThanDays} gündür sipariş yok`);
  if (s.registeredWithinDays != null) out.push(`son ${s.registeredWithinDays} günde kayıt`);
  if (s.hasAbandonedCart) out.push("terk edilmiş sepeti var");
  if (s.tenantId) out.push(`site: ${tenantName.get(s.tenantId) ?? "?"}`);
  return out;
}

export default async function SegmentsPage({ searchParams }: { searchParams: Promise<{ ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const [segments, tenantRows] = await Promise.all([segmentSizes(), db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name))]);
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));
  const builtin = segments.filter((s) => (s as { builtin?: boolean }).builtin);
  const custom = segments.filter((s) => !(s as { builtin?: boolean }).builtin);

  const SegmentRow = ({ s, removable }: { s: (typeof segments)[number]; removable?: boolean }) => (
    <tr>
      <td>
        <strong>{s.name}</strong>
        <div className="muted text-sm">{s.description || rules(s, tenantName).join(" · ") || "Tüm kişiler"}</div>
      </td>
      <td>{s.total.toLocaleString("tr-TR")}</td>
      <td>
        <strong>{s.reachable.toLocaleString("tr-TR")}</strong>
      </td>
      <td>
        <div className="row-actions">
          <Link className="btn btn-secondary btn-sm" href={`/marketing/campaigns/new?segment=${s.key}`}>
            Kampanya
          </Link>
          {removable ? (
            <form action={withBase("/api/segments")} method="post">
              <input type="hidden" name="_action" value="delete" />
              <input type="hidden" name="key" value={s.key} />
              <ConfirmButton className="btn btn-ghost btn-sm" message="Segment silinsin mi?" title="Sil">
                <IconTrash />
              </ConfirmButton>
            </form>
          ) : null}
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <PageHeader title="Segmentler" description="Müşterilerinizi sipariş sayısı, harcama ve son alışveriş tarihine göre gruplayın; kampanyaları hedefleyin." />
      <MarketingNav active="segments" />
      {sp.ok === "olusturuldu" ? <Alert tone="ok">Segment oluşturuldu.</Alert> : null}
      {sp.ok === "silindi" ? <Alert tone="ok">Segment silindi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <div className="grid-2">
        <div>
          <Panel title="Hazır segmentler" description="“Ulaşılabilir”: pazarlama izni olan ve abonelikten çıkmamış kişiler">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th>Kişi</th>
                    <th>Ulaşılabilir</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {builtin.map((s) => (
                    <SegmentRow key={s.key} s={s} />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Özel segmentler">
            {custom.length === 0 ? (
              <p className="muted text-sm panel-pad" style={{ margin: 0 }}>
                Henüz özel segment yok. Sağdaki formdan oluşturabilirsiniz.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Segment</th>
                      <th>Kişi</th>
                      <th>Ulaşılabilir</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {custom.map((s) => (
                      <SegmentRow key={s.key} s={s} removable />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
        <div>
          <Panel title="Yeni segment" description="Boş bıraktığınız kurallar uygulanmaz" padded>
            <form action={withBase("/api/segments")} method="post" className="form-stack">
              <div className="field">
                <label htmlFor="s-name">Segment adı</label>
                <input className="input" id="s-name" name="name" required placeholder="Örn. Sadık müşteriler" />
              </div>
              <div className="field">
                <label htmlFor="s-desc">Açıklama</label>
                <input className="input" id="s-desc" name="description" />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>En az sipariş</label>
                  <input className="input" name="minOrders" type="number" min={0} />
                </div>
                <div className="field">
                  <label>En fazla sipariş</label>
                  <input className="input" name="maxOrders" type="number" min={0} />
                </div>
              </div>
              <div className="field">
                <label>En az toplam harcama (TL)</label>
                <input className="input" name="minSpent" inputMode="decimal" />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Son X günde sipariş vermiş</label>
                  <input className="input" name="lastOrderWithinDays" type="number" min={1} />
                </div>
                <div className="field">
                  <label>X gündür sipariş vermemiş</label>
                  <input className="input" name="lastOrderOlderThanDays" type="number" min={1} />
                </div>
              </div>
              <div className="field">
                <label>Son X günde kayıt olmuş</label>
                <input className="input" name="registeredWithinDays" type="number" min={1} />
              </div>
              <div className="field">
                <label>Site</label>
                <select className="input" name="tenantId" defaultValue="">
                  <option value="">Tüm siteler</option>
                  {tenantRows.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="check">
                <input type="checkbox" name="hasAbandonedCart" value="1" /> Terk edilmiş sepeti olanlar
              </label>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  Segment oluştur
                </button>
              </div>
            </form>
          </Panel>
          <Panel padded>
            <p className="muted text-sm" style={{ margin: 0 }}>
              <StatusBadge tone="info">Bilgi</StatusBadge> Kişi listesi siparişler, üyeler, bülten aboneleri ve terk edilen sepetlerden otomatik oluşur; her dakika güncellenir.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
