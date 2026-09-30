import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, productOems, tenants } from "@guntan/db";
import { getAdminOrder, orderStatusLabel } from "@guntan/ecommerce";
import { arasConfigFromEnv, arasTrackingUrl } from "@guntan/shipping";
import { withBase } from "@/src/paths";
import { PageHeader, Panel, StatusBadge, formatTry, statusTone } from "@/src/ui";

export const metadata = { title: "Sipariş detayı" };

const PAYMENT_LABELS: Record<string, string> = { bank_transfer: "Havale / EFT", credit_card: "Kredi kartı (Garanti)" };
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  awaiting: "bekliyor",
  confirmed: "onaylandı",
  expired: "süresi doldu",
  cancelled: "iptal",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string; mesaj?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const aras = arasConfigFromEnv();
  const arasReady = aras !== null;
  const arasTest = aras?.mode === "TEST";
  const detail = await getAdminOrder(id);
  if (!detail) notFound();
  const { order, items, payments, shipments } = detail;
  const productIds = [...new Set(items.map((item) => item.productId))];
  const [tenant, oemRows] = await Promise.all([
    db.select().from(tenants).where(eq(tenants.id, order.tenantId)).limit(1).then((rows) => rows[0]),
    productIds.length
      ? db
          .select({ productId: productOems.productId, raw: productOems.raw })
          .from(productOems)
          .where(inArray(productOems.productId, productIds))
      : Promise.resolve([] as { productId: string; raw: string }[]),
  ]);
  const oemBy = new Map<string, string[]>();
  for (const oem of oemRows) {
    const list = oemBy.get(oem.productId) ?? [];
    if (list.length < 4) list.push(oem.raw);
    oemBy.set(oem.productId, list);
  }
  const address = order.shippingAddress ?? {};

  return (
    <>
      <PageHeader
        title={`Sipariş ${order.orderNo}`}
        description={`${tenant?.name ?? "Site"} · ${order.fullName} · ${order.email}`}
        actions={
          <Link className="btn btn-secondary" href="/orders">
            Listeye dön
          </Link>
        }
      />

      {sp.ok === "1" && (
        <p className="login-alert" style={{ background: "#e8f7ef", color: "#0f7a45" }} role="status">
          İşlem kaydedildi.
        </p>
      )}
      {sp.hata === "1" && (
        <p className="login-alert" role="alert">
          {sp.mesaj || "Bu işlem mevcut sipariş durumunda yapılamaz."}
        </p>
      )}

      <div className="kpis" style={{ marginBottom: "1rem" }}>
        <div className="kpi">
          <div className="kpi-label">Durum</div>
          <strong style={{ fontSize: "1.1rem" }}>
            <StatusBadge tone={statusTone(order.status)}>{orderStatusLabel(order.status)}</StatusBadge>
          </strong>
        </div>
        <div className="kpi">
          <div className="kpi-label">Toplam</div>
          <strong>{formatTry(order.grandTotal)}</strong>
        </div>
        <div className="kpi">
          <div className="kpi-label">Kalem</div>
          <strong>{items.length}</strong>
        </div>
        <div className="kpi">
          <div className="kpi-label">Tarih</div>
          <strong style={{ fontSize: "1rem" }}>{order.createdAt.toLocaleString("tr-TR")}</strong>
        </div>
      </div>

      <Panel title="Operasyon">
        <div className="panel-pad" style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "end" }}>
          {order.status === "pending_payment" && (
            <>
              {address.paymentMethod === "credit_card" ? (
                <p style={{ margin: 0, color: "#6b7280" }}>
                  Kart ödemesi bankadan onay bekliyor. 30 dakika içinde tamamlanmazsa otomatik iptal edilir.
                </p>
              ) : (
                <form action={withBase(`/api/orders/${order.id}/confirm`)} method="post">
                  <button className="btn btn-primary" type="submit">
                    Ödeme alındı
                  </button>
                </form>
              )}
              <form action={withBase(`/api/orders/${order.id}/cancel`)} method="post">
                <button className="btn btn-secondary" type="submit">
                  İptal et
                </button>
              </form>
            </>
          )}
          {order.status === "paid" && (
            <form action={withBase(`/api/orders/${order.id}/prepare`)} method="post">
              <button className="btn btn-primary" type="submit">
                Hazırlığa al
              </button>
            </form>
          )}
          {(order.status === "paid" || order.status === "preparing") && arasReady && (
            <form
              action={withBase(`/api/orders/${order.id}/ship`)}
              method="post"
              style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "end", width: "100%" }}
            >
              <input type="hidden" name="mode" value="aras" />
              <div className="field">
                <label htmlFor="pieceCount">Koli</label>
                <input className="input" id="pieceCount" name="pieceCount" type="number" min={1} defaultValue={1} style={{ width: "5rem" }} />
              </div>
              <div className="field">
                <label htmlFor="weightKg">Ağırlık (kg)</label>
                <input className="input" id="weightKg" name="weightKg" inputMode="decimal" defaultValue="1" style={{ width: "6rem" }} />
              </div>
              <button className="btn btn-primary" type="submit">
                Aras Kargo&apos;ya ver{arasTest ? " (test)" : ""}
              </button>
              <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                Aras&apos;ta gönderi kaydı açılır; takip no kargo şubeye teslim edilince otomatik gelir.
              </span>
            </form>
          )}
          {(order.status === "paid" || order.status === "preparing") && (
            <form
              action={withBase(`/api/orders/${order.id}/ship`)}
              method="post"
              style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "end" }}
            >
              <div className="field">
                <label htmlFor="carrier">Kargo firması</label>
                <input className="input" id="carrier" name="carrier" placeholder="Yurtiçi, MNG…" defaultValue={shipments[0]?.carrier ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="trackingNo">Takip no</label>
                <input className="input" id="trackingNo" name="trackingNo" placeholder="Takip numarası" defaultValue={shipments[0]?.trackingNo ?? ""} />
              </div>
              <button className={arasReady ? "btn btn-secondary" : "btn btn-primary"} type="submit">
                {arasReady ? "Elle kargoya ver" : "Kargoya ver"}
              </button>
            </form>
          )}
          {order.status === "shipped" && (
            <form action={withBase(`/api/orders/${order.id}/complete`)} method="post">
              <button className="btn btn-primary" type="submit">
                Teslim edildi / tamamla
              </button>
            </form>
          )}
          {["completed", "cancelled", "refunded"].includes(order.status) && (
            <p style={{ margin: 0, color: "#6b7280" }}>Bu sipariş için aktif operasyon adımı yok.</p>
          )}
        </div>
      </Panel>

      <Panel title="Kalemler">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>SKU / OEM</th>
                <th>Ürün</th>
                <th>Adet</th>
                <th>Birim</th>
                <th>Satır</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <code style={{ fontSize: "0.8rem" }}>{item.sku}</code>
                    {oemBy.get(item.productId)?.length ? (
                      <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>
                        OEM {oemBy.get(item.productId)!.join(", ")}
                      </div>
                    ) : null}
                  </td>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>{formatTry(item.unitPrice)}</td>
                  <td>{formatTry(Number(item.unitPrice) * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="quick-grid">
        <div className="panel panel-pad">
          <strong>Müşteri</strong>
          <p style={{ margin: "0.4rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
            {order.fullName}
            <br />
            {order.email}
            <br />
            {order.phone}
          </p>
        </div>
        <div className="panel panel-pad">
          <strong>Fatura</strong>
          <p style={{ margin: "0.4rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
            {address.invoiceType === "corporate" ? "Kurumsal" : "Bireysel"}
            {address.companyName ? (
              <>
                <br />
                {address.companyName}
              </>
            ) : null}
            {address.taxOffice || address.taxNumber ? (
              <>
                <br />
                {[address.taxOffice, address.taxNumber].filter(Boolean).join(" · ")}
              </>
            ) : null}
            {address.nationalId ? (
              <>
                <br />
                TCKN: {address.nationalId}
              </>
            ) : null}
            <br />
            {[
              address.billingLine1 || address.line1,
              address.billingDistrict || address.district,
              address.billingCity || address.city,
              address.billingPostalCode || address.postalCode,
            ]
              .filter(Boolean)
              .join(", ") || "Adres yok"}
          </p>
        </div>
        <div className="panel panel-pad">
          <strong>Teslimat</strong>
          <p style={{ margin: "0.4rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
            {address.shipFullName || order.fullName}
            <br />
            {address.shipPhone || order.phone}
            <br />
            {[address.line1, address.line2, address.district, address.city, address.postalCode]
              .filter(Boolean)
              .join(", ") || "Adres yok"}
            {address.shipDifferent === "1" ? (
              <>
                <br />
                <em>Fatura adresinden farklı</em>
              </>
            ) : null}
          </p>
        </div>
        <div className="panel panel-pad">
          <strong>Ödeme</strong>
          <p style={{ margin: "0.4rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
            {payments.length === 0
              ? "Kayıt yok"
              : payments
                  .map((p) => `${PAYMENT_LABELS[p.method] ?? p.method} · ${PAYMENT_STATUS_LABELS[p.status] ?? p.status} · ${formatTry(p.amount)}`)
                  .join(" / ")}
          </p>
          {Number(address.installments ?? "1") > 1 ? (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              {address.installments} taksit · Vade farkı: {formatTry(address.installmentFee ?? "0")}
            </p>
          ) : null}
          {payments.some((p) => p.method === "credit_card" && p.providerRef?.includes(":")) ? (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
              Banka ref: {payments.find((p) => p.method === "credit_card")?.providerRef?.split(":")[1]}
            </p>
          ) : null}
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            Ara: {formatTry(order.subtotal)} · Kargo: {formatTry(order.shippingTotal)} · İndirim:{" "}
            {formatTry(order.discountTotal)}
          </p>
          {order.notes ? (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              Not: {order.notes}
            </p>
          ) : null}
        </div>
        <div className="panel panel-pad">
          <strong>Kargo</strong>
          <p style={{ margin: "0.4rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
            {shipments.length === 0
              ? "Henüz kargo kaydı yok"
              : shipments
                  .map((s) => `${s.carrier ?? "Firma yok"} · ${s.trackingNo ?? "Takip no bekleniyor"} · ${s.status}`)
                  .join(" / ")}
          </p>
          {shipments.some((s) => s.carrier === "Aras Kargo" && s.trackingNo) ? (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              <a
                href={arasTrackingUrl(shipments.find((s) => s.carrier === "Aras Kargo" && s.trackingNo)!.trackingNo!)}
                target="_blank"
                rel="noreferrer"
              >
                Aras takip sayfası
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
