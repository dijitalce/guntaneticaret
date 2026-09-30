import Link from "next/link";
import { notFound } from "next/navigation";
import { getAbandonedCart, getAutomationSettings, getTenantContext } from "@guntan/db";
import { IconSend } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate, formatTry } from "@/src/ui";
import { StatRow, relativeTime } from "@/src/ui-ext";

export const metadata = { title: "Sepet detayı" };
export const dynamic = "force-dynamic";

const MSG_STATUS: Record<string, { label: string; tone: "ok" | "bad" | "neutral" | "warn" }> = {
  sent: { label: "Gönderildi", tone: "ok" },
  failed: { label: "Hata", tone: "bad" },
  skipped: { label: "Atlandı", tone: "neutral" },
  queued: { label: "Sırada", tone: "warn" },
};

export default async function AbandonedCartDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const cart = await getAbandonedCart(id);
  if (!cart) notFound();
  const [tenant, automation] = await Promise.all([getTenantContext(cart.tenantId), getAutomationSettings()]);
  const auto = automation.abandoned_cart;
  const qty = cart.items.reduce((s, i) => s + i.qty, 0);
  const restoreUrl = `${tenant.url}/api/cart/restore?c=${cart.id}`;

  return (
    <>
      <PageHeader
        title={cart.name || cart.email || "Anonim ziyaretçi"}
        description={`${cart.tenantName ?? tenant.name} · son işlem ${relativeTime(cart.lastActivity)}`}
        crumbs={[{ label: "Terk edilmiş sepetler", href: "/abandoned-carts" }]}
        actions={
          cart.recoveredOrderId ? (
            <Link className="btn btn-primary" href={`/orders/${cart.recoveredOrderId}`}>
              Siparişi aç
            </Link>
          ) : null
        }
      />
      {sp.ok === "hatirlatildi" ? <Alert tone="ok">Hatırlatma gönderildi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {cart.recoveredOrderId ? (
        <Alert tone="ok">
          Bu sepet {cart.recoveredAt ? formatDate(cart.recoveredAt, true) : ""} tarihinde <strong>{cart.recoveredOrderNo}</strong> numaralı siparişle kurtarıldı.
        </Alert>
      ) : null}

      <StatRow
        items={[
          { label: "Sepet tutarı", value: formatTry(cart.total) },
          { label: "Ürün", value: `${qty} adet`, hint: `${cart.items.length} çeşit` },
          { label: "Oluşturulma", value: formatDate(cart.createdAt, true) },
          { label: "Hatırlatma", value: `${cart.reminderCount}×`, hint: cart.lastRemindedAt ? `son: ${relativeTime(cart.lastRemindedAt)}` : "henüz gönderilmedi" },
        ]}
      />

      <div className="grid-2">
        <div>
          <Panel title="Sepetteki ürünler">
            {cart.items.length === 0 ? (
              <EmptyState title="Sepet boşaltılmış" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Adet</th>
                      <th>Birim</th>
                      <th>Toplam</th>
                      <th>Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.items.map((i) => (
                      <tr key={i.product_id}>
                        <td>
                          <div className="cell-product">
                            {i.image_url ? <img src={i.image_url} alt="" width={40} height={40} loading="lazy" /> : null}
                            <div>
                              <Link href={`/catalog/products?q=${encodeURIComponent(i.sku ?? i.name)}`}>
                                <strong>{i.name}</strong>
                              </Link>
                              {i.sku ? <div className="muted text-sm mono">{i.sku}</div> : null}
                            </div>
                          </div>
                        </td>
                        <td>{i.qty}</td>
                        <td>{formatTry(i.price)}</td>
                        <td>
                          <strong>{formatTry(i.price * i.qty)}</strong>
                        </td>
                        <td>
                          {i.stock_qty > 0 ? <StatusBadge tone="ok">{i.stock_qty}</StatusBadge> : <StatusBadge tone="bad">Tükendi</StatusBadge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Gönderilen mesajlar" description="Bu sepet için gönderilen hatırlatmalar">
            {cart.messages.length === 0 ? (
              <EmptyState title="Henüz mesaj gönderilmedi" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kanal</th>
                      <th>Alıcı</th>
                      <th>Durum</th>
                      <th>Etkileşim</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.messages.map((m) => {
                      const st = MSG_STATUS[m.status] ?? { label: m.status, tone: "neutral" as const };
                      return (
                        <tr key={m.id}>
                          <td className="text-sm">{m.channel === "sms" ? "SMS" : "E-posta"}</td>
                          <td className="text-sm">{m.recipient}</td>
                          <td>
                            <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                            {m.error ? <div className="muted text-sm">{m.error}</div> : null}
                          </td>
                          <td className="text-sm">
                            {m.clicked_at ? "Tıkladı" : m.opened_at ? "Açtı" : <span className="muted">—</span>}
                          </td>
                          <td className="text-sm muted">{formatDate(m.created_at, true)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div>
          <Panel title="Ziyaretçi" padded>
            <div className="customer-box">
              <span className="customer-avatar" aria-hidden>
                {(cart.name || cart.email || "?").trim().charAt(0).toUpperCase()}
              </span>
              <div>
                <strong>{cart.name || "İsimsiz"}</strong>
                <div className="muted text-sm">{cart.email ?? "E-posta yok"}</div>
                {cart.phone ? <div className="muted text-sm">{cart.phone}</div> : null}
              </div>
            </div>
            {cart.customerId ? (
              <Link className="btn btn-secondary btn-sm" href={`/customers/${cart.customerId}`} style={{ marginTop: "0.8rem" }}>
                Müşteri profilini aç
              </Link>
            ) : (
              <p className="muted text-sm">Üye değil; iletişim bilgisi ödeme adımında bırakıldı.</p>
            )}
          </Panel>

          {!cart.recoveredOrderId && cart.items.length > 0 ? (
            <Panel title="Hatırlatma gönder" padded>
              {cart.email || cart.phone ? (
                <form action={withBase(`/api/abandoned-carts/${cart.id}/remind`)} method="post" className="form-stack">
                  <div className="field">
                    <label htmlFor="couponCode">İndirim kodu (isteğe bağlı)</label>
                    <input className="input mono" id="couponCode" name="couponCode" defaultValue={auto.couponCode} placeholder="SEPET10" />
                    <small className="field-hint">Kodun Pazarlama → Kuponlar bölümünde tanımlı ve aktif olduğundan emin olun.</small>
                  </div>
                  {cart.phone ? (
                    <label className="check">
                      <input type="checkbox" name="sms" value="1" defaultChecked={!cart.email} /> SMS de gönder
                    </label>
                  ) : null}
                  <button className="btn btn-primary" type="submit">
                    <IconSend width={15} height={15} />
                    {cart.reminderCount ? `${cart.reminderCount + 1}. hatırlatmayı gönder` : "Hatırlatma gönder"}
                  </button>
                </form>
              ) : (
                <p className="muted text-sm">Bu ziyaretçinin iletişim bilgisi olmadığı için hatırlatma gönderilemez.</p>
              )}
            </Panel>
          ) : null}

          <Panel title="Sepet bağlantısı" padded>
            <p className="muted text-sm" style={{ marginTop: 0 }}>
              Müşteriye telefonla veya WhatsApp’tan iletebilirsiniz; bağlantı sepeti aynen geri yükler.
            </p>
            <div className="copy-url">
              <code>{restoreUrl}</code>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
