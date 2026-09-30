import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  allOrderTags,
  customerOrderStats,
  customers,
  db,
  getOrderAttribution,
  getOrderTags,
  getShippingSettings,
  listOrderEvents,
  productOems,
  returnRequests,
  tenants,
} from "@guntan/db";
import { arasConfigFromEnv, arasTrackingUrl, getAdminOrder, orderStatusLabel } from "@guntan/ecommerce";
import { IconArrowLeft, IconCheck, IconExternal, IconPrinter, IconTruck } from "@/src/icons";
import { ConfirmButton } from "@/src/form-fields";
import { OrderTimeline } from "@/src/order-timeline";
import { durationText, relativeTime } from "@/src/ui-ext";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel, StatusBadge, formatDate, formatTry, statusTone } from "@/src/ui";

export const metadata = { title: "Sipariş detayı" };
export const dynamic = "force-dynamic";

const RETURN_LABELS: Record<string, string> = { open: "Açık", approved: "Onaylandı", rejected: "Reddedildi" };
const JOURNEY_LABEL: Record<string, string> = {
  pv: "Sayfa",
  product: "Ürün",
  add_to_cart: "Sepete ekledi",
  checkout: "Ödemeye geçti",
  contact: "İletişim bıraktı",
  purchase: "Satın aldı",
  popup_view: "Popup gördü",
  popup_click: "Popup tıkladı",
};

const PAYMENT_LABELS: Record<string, string> = { bank_transfer: "Havale / EFT", credit_card: "Kredi kartı (Garanti)" };
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  awaiting: "Bekliyor",
  confirmed: "Onaylandı",
  expired: "Süresi doldu",
  cancelled: "İptal",
};
const STEPS = [
  { status: "pending_payment", label: "Ödeme bekliyor" },
  { status: "paid", label: "Ödendi" },
  { status: "preparing", label: "Hazırlanıyor" },
  { status: "shipped", label: "Kargoda" },
  { status: "completed", label: "Tamamlandı" },
];

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
  const [tenant, oemRows, events, attribution, tags, knownTags, returns, stats, customer] = await Promise.all([
    db.select().from(tenants).where(eq(tenants.id, order.tenantId)).limit(1).then((rows) => rows[0]),
    productIds.length
      ? db
          .select({ productId: productOems.productId, raw: productOems.raw })
          .from(productOems)
          .where(inArray(productOems.productId, productIds))
      : Promise.resolve([] as { productId: string; raw: string }[]),
    listOrderEvents(id).catch(() => []),
    getOrderAttribution(id).catch(() => null),
    getOrderTags(id).catch(() => [] as string[]),
    allOrderTags().catch(() => [] as string[]),
    db.select().from(returnRequests).where(eq(returnRequests.orderId, id)).orderBy(desc(returnRequests.createdAt)),
    customerOrderStats(order.customerId, order.email).catch(() => ({ count: 0, total: 0, firstAt: null })),
    order.customerId
      ? db
          .select({ id: customers.id, createdAt: customers.createdAt })
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);
  const shipping = await getShippingSettings();
  const openReturn = returns.find((r) => r.status === "open");
  const oemBy = new Map<string, string[]>();
  for (const oem of oemRows) {
    const list = oemBy.get(oem.productId) ?? [];
    if (list.length < 4) list.push(oem.raw);
    oemBy.set(oem.productId, list);
  }
  const address = order.shippingAddress ?? {};
  const isCard = address.paymentMethod === "credit_card";
  const installments = Number(address.installments ?? "1");
  const cardPayment = payments.find((p) => p.method === "credit_card");
  const bankRef = cardPayment?.providerRef?.includes(":") ? cardPayment.providerRef.split(":")[1] : null;
  const arasShipment = shipments.find((s) => s.carrier === "Aras Kargo" && s.trackingNo);
  const stepIndex = STEPS.findIndex((s) => s.status === order.status);
  const closed = ["cancelled", "refunded"].includes(order.status);
  const canShip = order.status === "paid" || order.status === "preparing";

  const billingAddress =
    [
      address.billingLine1 || address.line1,
      address.billingDistrict || address.district,
      address.billingCity || address.city,
      address.billingPostalCode || address.postalCode,
    ]
      .filter(Boolean)
      .join(", ") || "Adres yok";
  const shippingAddress =
    [address.line1, address.line2, address.district, address.city, address.postalCode].filter(Boolean).join(", ") ||
    "Adres yok";

  return (
    <>
      <PageHeader
        title={`Sipariş ${order.orderNo}`}
        description={`${formatDate(order.createdAt)} · ${tenant?.name ?? "Site"}`}
        crumbs={[{ href: "/orders", label: "Siparişler" }]}
        actions={
          <>
            <StatusBadge tone={statusTone(order.status)}>{orderStatusLabel(order.status)}</StatusBadge>
            <a className="btn btn-secondary" href={withBase(`/api/orders/labels?ids=${order.id}`)} target="_blank" rel="noreferrer">
              <IconPrinter />
              Kargo etiketi
            </a>
            <Link className="btn btn-secondary" href="/orders">
              <IconArrowLeft />
              Listeye dön
            </Link>
          </>
        }
      />

      {sp.ok === "1" && <Alert tone="ok">İşlem kaydedildi.</Alert>}
      {sp.hata === "1" && <Alert>{sp.mesaj || "Bu işlem mevcut sipariş durumunda yapılamaz."}</Alert>}

      <Panel>
        <div className="stepper" aria-label="Sipariş akışı">
          {STEPS.map((s, i) => {
            const done = !closed && stepIndex >= 0 && (i < stepIndex || order.status === "completed");
            const current = !closed && i === stepIndex && order.status !== "completed";
            return (
              <div key={s.status} className={`step${done ? " is-done" : ""}${current ? " is-current" : ""}`}>
                <span className="step-dot">{done ? <IconCheck /> : i + 1}</span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
        {closed ? <div className="stepper-note">Bu sipariş {orderStatusLabel(order.status).toLocaleLowerCase("tr-TR")}.</div> : null}
      </Panel>

      <div className="grid-2">
        <div>
          <Panel title="Sıradaki adım">
            {order.status === "pending_payment" && (
              <div className="op-block">
                {isCard ? (
                  <>
                    <h3>Kart ödemesi bekleniyor</h3>
                    <p>Bankadan onay gelince sipariş otomatik olarak “Ödendi” olur. 30 dakika içinde tamamlanmazsa iptal edilir.</p>
                  </>
                ) : (
                  <>
                    <h3>Havale / EFT kontrolü</h3>
                    <p>
                      Hesaba {formatTry(order.grandTotal)} tutarında, açıklamasında {order.orderNo} geçen ödeme geldiyse onaylayın.
                    </p>
                  </>
                )}
                <div className="op-actions">
                  {!isCard && (
                    <form action={withBase(`/api/orders/${order.id}/confirm`)} method="post">
                      <button className="btn btn-primary" type="submit">
                        <IconCheck />
                        Ödeme alındı
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {["pending_payment", "paid", "preparing"].includes(order.status) && (
              <details className="op-block op-collapse">
                <summary>Siparişi iptal et</summary>
                <form action={withBase(`/api/orders/${order.id}/cancel`)} method="post" className="form-stack">
                  <div className="field">
                    <label htmlFor="cancel-reason">İptal sebebi</label>
                    <input className="input" id="cancel-reason" name="reason" placeholder="Örn. Stokta kalmadı, müşteri vazgeçti" />
                  </div>
                  <label className="check">
                    <input type="checkbox" name="notify" value="1" defaultChecked /> Müşteriye iptal bildirimi gönder
                  </label>
                  <div className="op-actions">
                    <ConfirmButton className="btn btn-danger" message="Sipariş iptal edilsin mi? Stok rezervasyonu serbest bırakılır.">
                      Siparişi iptal et
                    </ConfirmButton>
                  </div>
                </form>
              </details>
            )}

            {order.status === "paid" && (
              <div className="op-block">
                <h3>Hazırlığa al</h3>
                <p>Ürünleri toplamaya başladığınızda siparişi hazırlığa alın. İsterseniz doğrudan kargoya da verebilirsiniz.</p>
                <form action={withBase(`/api/orders/${order.id}/prepare`)} method="post">
                  <button className="btn btn-primary" type="submit">
                    Hazırlığa al
                  </button>
                </form>
              </div>
            )}

            {canShip && arasReady && (
              <div className="op-block">
                <h3>Aras Kargo&apos;ya ver{arasTest ? " (test ortamı)" : ""}</h3>
                <p>Aras&apos;ta gönderi kaydı açılır; takip numarası paket şubeye teslim edilince otomatik gelir.</p>
                <form action={withBase(`/api/orders/${order.id}/ship`)} method="post" className="op-actions">
                  <input type="hidden" name="mode" value="aras" />
                  <div className="field">
                    <label htmlFor="pieceCount">Koli</label>
                    <input className="input" id="pieceCount" name="pieceCount" type="number" min={1} defaultValue={shipping.defaultPieces} style={{ width: "5.5rem" }} />
                  </div>
                  <div className="field">
                    <label htmlFor="weightKg">Ağırlık (kg)</label>
                    <input className="input" id="weightKg" name="weightKg" inputMode="decimal" defaultValue={String(shipping.defaultWeightKg).replace(".", ",")} style={{ width: "6.5rem" }} />
                  </div>
                  <button className="btn btn-primary" type="submit">
                    <IconTruck />
                    Aras&apos;a gönder
                  </button>
                </form>
              </div>
            )}

            {canShip && (
              <div className="op-block">
                <h3>{arasReady ? "Elle kargo bilgisi gir" : "Kargoya ver"}</h3>
                <p>Farklı bir firma ile gönderdiyseniz firma adını ve takip numarasını girin.</p>
                <form action={withBase(`/api/orders/${order.id}/ship`)} method="post" className="op-actions">
                  <div className="field">
                    <label htmlFor="carrier">Kargo firması</label>
                    <input className="input" id="carrier" name="carrier" placeholder="Yurtiçi, MNG…" defaultValue={shipments[0]?.carrier ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor="trackingNo">Takip no</label>
                    <input className="input" id="trackingNo" name="trackingNo" placeholder="Takip numarası" defaultValue={shipments[0]?.trackingNo ?? ""} />
                  </div>
                  <button className={arasReady ? "btn btn-secondary" : "btn btn-primary"} type="submit">
                    Kargoya ver
                  </button>
                </form>
              </div>
            )}

            {order.status === "shipped" && (
              <div className="op-block">
                <h3>Teslimatı tamamla</h3>
                <p>Müşteri paketi teslim aldıysa siparişi tamamlayın.</p>
                <form action={withBase(`/api/orders/${order.id}/complete`)} method="post">
                  <button className="btn btn-primary" type="submit">
                    <IconCheck />
                    Teslim edildi
                  </button>
                </form>
              </div>
            )}

            {["completed", "cancelled", "refunded"].includes(order.status) && (
              <div className="op-block">
                <p style={{ margin: 0 }}>Bu sipariş için yapılacak bir adım yok.</p>
              </div>
            )}
          </Panel>

          <Panel title="Ürünler" description={`${items.reduce((a, i) => a + i.qty, 0)} adet · ${items.length} kalem`}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th className="num">Adet</th>
                    <th className="num">Birim</th>
                    <th className="num">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        <span className="sub">
                          <code>{item.sku}</code>
                          {oemBy.get(item.productId)?.length ? ` · OEM ${oemBy.get(item.productId)!.join(", ")}` : ""}
                        </span>
                      </td>
                      <td className="num">{item.qty}</td>
                      <td className="num">{formatTry(item.unitPrice)}</td>
                      <td className="num">{formatTry(Number(item.unitPrice) * item.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-pad">
              <dl className="dl-rows" style={{ marginLeft: "auto", maxWidth: 320 }}>
                <div>
                  <dt>Ara toplam</dt>
                  <dd>{formatTry(order.subtotal)}</dd>
                </div>
                <div>
                  <dt>Kargo</dt>
                  <dd>{formatTry(order.shippingTotal)}</dd>
                </div>
                {Number(order.discountTotal) > 0 ? (
                  <div>
                    <dt>İndirim</dt>
                    <dd>−{formatTry(order.discountTotal)}</dd>
                  </div>
                ) : null}
                {installments > 1 ? (
                  <div>
                    <dt>Vade farkı ({installments} taksit)</dt>
                    <dd>{formatTry(address.installmentFee ?? "0")}</dd>
                  </div>
                ) : null}
                <div className="is-total">
                  <dt>Genel toplam</dt>
                  <dd>{formatTry(order.grandTotal)}</dd>
                </div>
              </dl>
            </div>
          </Panel>

          <Panel title="Zaman çizelgesi" description="Siparişteki tüm adımlar, bildirimler ve ekip notları">
            <div className="panel-pad">
              <OrderTimeline orderId={order.id} events={events} />
            </div>
          </Panel>

          <Panel title="İadeler" description={returns.length ? `${returns.length} iade kaydı` : "Bu siparişte iade kaydı yok"}>
            <div className="panel-pad form-stack">
              {returns.map((r) => (
                <div key={r.id} className="op-block">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center" }}>
                    <strong>İade talebi · {formatDate(r.createdAt)}</strong>
                    <StatusBadge tone={r.status === "approved" ? "ok" : r.status === "rejected" ? "bad" : "warn"}>
                      {RETURN_LABELS[r.status] ?? r.status}
                    </StatusBadge>
                  </div>
                  <p style={{ margin: "0.4rem 0 0" }}>{r.reason}</p>
                  {r.status === "open" ? (
                    <form action={withBase(`/api/orders/${order.id}/returns`)} method="post" className="form-stack" style={{ marginTop: "0.75rem" }}>
                      <input type="hidden" name="returnId" value={r.id} />
                      <div className="field">
                        <label htmlFor={`ret-msg-${r.id}`}>Müşteriye mesaj (isteğe bağlı)</label>
                        <input className="input" id={`ret-msg-${r.id}`} name="message" placeholder="Örn. Ücret iadeniz 3 iş günü içinde yapılacak" />
                      </div>
                      <label className="check text-sm">
                        <input type="checkbox" name="notify" value="1" defaultChecked /> Müşteriye bildirim gönder
                      </label>
                      <label className="check text-sm">
                        <input type="checkbox" name="refund" value="1" /> Onaylarsam siparişi “İade edildi” olarak işaretle
                      </label>
                      <div className="op-actions">
                        <button className="btn btn-primary btn-sm" type="submit" name="_action" value="approve">
                          İadeyi onayla
                        </button>
                        <button className="btn btn-secondary btn-sm" type="submit" name="_action" value="reject">
                          Reddet
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))}
              {!openReturn && ["paid", "preparing", "shipped", "completed"].includes(order.status) ? (
                <details className="op-collapse">
                  <summary>İade talebi oluştur</summary>
                  <form action={withBase(`/api/orders/${order.id}/returns`)} method="post" className="form-stack" style={{ marginTop: "0.75rem" }}>
                    <input type="hidden" name="_action" value="create" />
                    <div className="field">
                      <label htmlFor="ret-reason">İade sebebi</label>
                      <textarea className="input" id="ret-reason" name="reason" rows={2} required placeholder="Örn. Yanlış parça, araca uymadı" />
                    </div>
                    <label className="check text-sm">
                      <input type="checkbox" name="notify" value="1" defaultChecked /> Müşteriye “İade talebi alındı” bildirimi gönder
                    </label>
                    <div className="op-actions">
                      <button className="btn btn-secondary btn-sm" type="submit">
                        İade kaydı aç
                      </button>
                    </div>
                  </form>
                </details>
              ) : null}
            </div>
          </Panel>
        </div>

        <div>
          <Panel
            title="Müşteri"
            padded
            action={
              customer ? (
                <Link className="btn btn-secondary btn-sm" href={`/customers/${customer.id}`}>
                  Profil
                </Link>
              ) : (
                <StatusBadge>Misafir</StatusBadge>
              )
            }
          >
            <div className="customer-box">
              <span className="customer-avatar" aria-hidden>
                {order.fullName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]!.toLocaleUpperCase("tr-TR"))
                  .join("")}
              </span>
              <div>
                <strong>{order.fullName}</strong>
                <span className="muted text-sm">
                  {stats.count > 1 ? `${stats.count} sipariş · ${formatTry(stats.total)}` : "İlk siparişi"}
                  {customer ? ` · Üye: ${formatDate(customer.createdAt, false)}` : ""}
                </span>
              </div>
            </div>
            <dl className="dl">
              <div>
                <dt>Ad soyad</dt>
                <dd>{order.fullName}</dd>
              </div>
              <div>
                <dt>E-posta</dt>
                <dd>
                  <a href={`mailto:${order.email}`}>{order.email}</a>
                </dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{order.phone ? <a href={`tel:${order.phone}`}>{order.phone}</a> : "—"}</dd>
              </div>
              {order.notes ? (
                <div>
                  <dt>Sipariş notu</dt>
                  <dd>{order.notes}</dd>
                </div>
              ) : null}
              {order.couponCode ? (
                <div>
                  <dt>Kupon</dt>
                  <dd>
                    <code>{order.couponCode}</code>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Panel>

          <Panel title="Etiketler" padded>
            <form action={withBase(`/api/orders/${order.id}/tags`)} method="post" className="form-stack">
              {tags.length ? (
                <div className="tag-list">
                  {tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              <input className="input" name="tags" defaultValue={tags.join(", ")} placeholder="Acil, toptan, servis…" list="order-tag-options" />
              <datalist id="order-tag-options">
                {knownTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <div className="op-actions">
                <button className="btn btn-secondary btn-sm" type="submit">
                  Etiketleri kaydet
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Dönüşüm detayları" padded>
            {attribution ? (
              <dl className="dl">
                <div>
                  <dt>Kaynak</dt>
                  <dd>
                    <strong>{attribution.source ?? "Doğrudan"}</strong>
                    {attribution.medium && attribution.medium !== "unknown" ? <span className="muted"> · {attribution.medium}</span> : null}
                  </dd>
                </div>
                {attribution.campaign ? (
                  <div>
                    <dt>Kampanya</dt>
                    <dd>{attribution.campaign}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Cihaz</dt>
                  <dd>{[attribution.device, attribution.browser, attribution.os].filter(Boolean).join(" · ") || "—"}</dd>
                </div>
                <div>
                  <dt>Oturum süresi</dt>
                  <dd>{durationText(Number(attribution.duration_sec ?? 0))}</dd>
                </div>
                <div>
                  <dt>Görüntülenen sayfa</dt>
                  <dd>{Number(attribution.pageviews ?? 0)}</dd>
                </div>
                {attribution.first_seen ? (
                  <div>
                    <dt>İlk ziyaret</dt>
                    <dd>
                      {formatDate(attribution.first_seen)} <span className="muted">({relativeTime(attribution.first_seen)})</span>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Takip</dt>
                  <dd className="tag-list">
                    <span className={`tag${attribution.fbp || attribution.fbc ? " is-on" : ""}`}>Meta {attribution.fbc ? "(reklam tıklaması)" : attribution.fbp ? "" : "yok"}</span>
                    <span className={`tag${attribution.ga_cid ? " is-on" : ""}`}>Google {attribution.ga_cid ? "" : "yok"}</span>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="muted text-sm" style={{ margin: 0 }}>
                Bu sipariş ziyaret takibi eklenmeden önce oluşturulmuş; kaynak bilgisi yok.
              </p>
            )}
          </Panel>

          {attribution ? (
            <Panel title="Oturum detayları" padded>
              <dl className="dl">
                <div>
                  <dt>Giriş sayfası</dt>
                  <dd className="text-sm" style={{ wordBreak: "break-all" }}>
                    {attribution.landing ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt>Yönlendiren</dt>
                  <dd className="text-sm" style={{ wordBreak: "break-all" }}>
                    {attribution.referrer ?? "Doğrudan giriş"}
                  </dd>
                </div>
                <div>
                  <dt>IP adresi</dt>
                  <dd className="mono text-sm">{attribution.ip ?? "—"}</dd>
                </div>
              </dl>
              {attribution.journey.length ? (
                <>
                  <h3 className="subhead">Müşteri yolculuğu</h3>
                  <ol className="journey">
                    {attribution.journey.map((j, i) => (
                      <li key={i}>
                        <span className="journey-type">{JOURNEY_LABEL[j.type] ?? j.type}</span>
                        <span className="journey-path" title={j.path ?? ""}>
                          {j.title || j.path || "—"}
                        </span>
                        <span className="muted text-sm">
                          {new Date(j.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
            </Panel>
          ) : null}

          <Panel title="Teslimat" padded>
            <dl className="dl">
              <div>
                <dt>Alıcı</dt>
                <dd>
                  {address.shipFullName || order.fullName} · {address.shipPhone || order.phone}
                </dd>
              </div>
              <div>
                <dt>Adres</dt>
                <dd>{shippingAddress}</dd>
              </div>
              {address.shipDifferent === "1" ? <span className="badge badge-info">Fatura adresinden farklı</span> : null}
            </dl>
          </Panel>

          <Panel title="Fatura" padded>
            <dl className="dl">
              <div>
                <dt>Tür</dt>
                <dd>{address.invoiceType === "corporate" ? "Kurumsal" : "Bireysel"}</dd>
              </div>
              {address.companyName ? (
                <div>
                  <dt>Firma</dt>
                  <dd>{address.companyName}</dd>
                </div>
              ) : null}
              {address.taxOffice || address.taxNumber ? (
                <div>
                  <dt>Vergi dairesi / no</dt>
                  <dd>{[address.taxOffice, address.taxNumber].filter(Boolean).join(" · ")}</dd>
                </div>
              ) : null}
              {address.nationalId ? (
                <div>
                  <dt>TC kimlik no</dt>
                  <dd>{address.nationalId}</dd>
                </div>
              ) : null}
              <div>
                <dt>Adres</dt>
                <dd>{billingAddress}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Ödeme" padded>
            {payments.length === 0 ? (
              <p className="muted text-sm" style={{ margin: 0 }}>
                Ödeme kaydı yok.
              </p>
            ) : (
              <dl className="dl">
                {payments.map((p) => (
                  <div key={p.id}>
                    <dt>{PAYMENT_LABELS[p.method] ?? p.method}</dt>
                    <dd style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span>{formatTry(p.amount)}</span>
                      <StatusBadge tone={statusTone(p.status)}>{PAYMENT_STATUS_LABELS[p.status] ?? p.status}</StatusBadge>
                    </dd>
                  </div>
                ))}
                {installments > 1 ? (
                  <div>
                    <dt>Taksit</dt>
                    <dd>{installments} taksit</dd>
                  </div>
                ) : null}
                {bankRef ? (
                  <div>
                    <dt>Banka referansı</dt>
                    <dd>
                      <code>{bankRef}</code>
                    </dd>
                  </div>
                ) : null}
              </dl>
            )}
          </Panel>

          <Panel title="Kargo" padded>
            {shipments.length === 0 ? (
              <p className="muted text-sm" style={{ margin: 0 }}>
                Henüz kargo kaydı yok.
              </p>
            ) : (
              <dl className="dl">
                {shipments.map((s) => (
                  <div key={s.id}>
                    <dt>{s.carrier ?? "Firma belirtilmedi"}</dt>
                    <dd style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span>{s.trackingNo ?? "Takip no bekleniyor"}</span>
                      <StatusBadge tone={statusTone(s.status)}>{s.status}</StatusBadge>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {arasShipment ? (
              <a
                className="btn btn-secondary btn-sm"
                href={arasTrackingUrl(arasShipment.trackingNo!)}
                target="_blank"
                rel="noreferrer"
                style={{ marginTop: "0.8rem", width: "100%" }}
              >
                <IconExternal />
                Aras takip sayfası
              </a>
            ) : null}
          </Panel>
        </div>
      </div>
    </>
  );
}
