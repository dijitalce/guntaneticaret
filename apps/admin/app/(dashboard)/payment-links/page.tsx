import { getPaymentLink, listPaymentLinks, paymentLinkStats, type PaymentLinkStatus } from "@guntan/db";
import { CopyButton } from "@/src/copy-button";
import { ConfirmButton } from "@/src/form-fields";
import { withBase } from "@/src/paths";
import { loadSites } from "@/src/site-picker";
import { storefrontUrl } from "@/src/storefront";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate, formatTry, type Tone } from "@/src/ui";
import { TabNav } from "@/src/ui-ext";

export const metadata = { title: "Tahsilatlar" };
export const dynamic = "force-dynamic";

const FILTERS = ["pending", "paid", "cancelled", "all"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS: Record<PaymentLinkStatus, { label: string; tone: Tone }> = {
  pending: { label: "Ödeme bekliyor", tone: "warn" },
  paid: { label: "Ödendi", tone: "ok" },
  cancelled: { label: "İptal", tone: "neutral" },
};

const OK_MESSAGE: Record<string, string> = {
  cancelled: "Bağlantı iptal edildi; müşteri artık ödeme yapamaz.",
  reopened: "Bağlantı yeniden ödemeye açıldı.",
  deleted: "Tahsilat silindi.",
};

export default async function PaymentLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; ok?: string; hata?: string; yeni?: string }>;
}) {
  const sp = await searchParams;
  const filter: Filter = FILTERS.includes(sp.durum as Filter) ? (sp.durum as Filter) : "all";
  const [links, stats, sites, created] = await Promise.all([
    listPaymentLinks(filter),
    paymentLinkStats(),
    loadSites(),
    sp.yeni ? getPaymentLink(sp.yeni) : Promise.resolve(null),
  ]);
  const fallback = storefrontUrl();
  const siteUrl = new Map(sites.map((s) => [s.id, s.host.includes(".") ? `https://${s.host}` : fallback]));
  const siteName = new Map(sites.map((s) => [s.id, s.name]));
  const linkUrl = (tenantId: string, code: string) => `${siteUrl.get(tenantId) ?? fallback}/tahsilat/${code}`;
  const back = `/payment-links?durum=${filter}`;

  return (
    <>
      <PageHeader
        title="Tahsilatlar"
        description="Ürün eklemeden yalnızca tutar girerek ödeme bağlantısı oluşturun. Bağlantıyı müşteriye gönderin; müşteri Garanti BBVA sanal POS ile kartla öder, durum burada otomatik güncellenir."
      />
      {created ? (
        <Alert tone="ok">
          <strong>{created.title}</strong> için {formatTry(created.amount)} tutarında bağlantı hazır:
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.4rem" }}>
            <code className="mono" style={{ wordBreak: "break-all" }}>{linkUrl(created.tenant_id, created.code)}</code>
            <CopyButton value={linkUrl(created.tenant_id, created.code)} label="Bağlantıyı kopyala" />
          </div>
        </Alert>
      ) : null}
      {sp.ok && OK_MESSAGE[sp.ok] ? <Alert tone="ok">{OK_MESSAGE[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      <div className="kpis">
        <Kpi label="Ödeme bekleyen" value={stats.pending} hint={formatTry(stats.pendingAmount)} tone="warn" />
        <Kpi label="Ödenen" value={stats.paid} hint={formatTry(stats.paidAmount)} tone="ok" />
        <Kpi label="İptal" value={stats.cancelled} />
      </div>

      <Panel title="Yeni tahsilat" padded>
        <form action={withBase("/api/payment-links")} method="post" className="form-stack">
          <div className="form-row">
            <div className="field">
              <label htmlFor="pl-title">Başlık</label>
              <input className="input" id="pl-title" name="title" required maxLength={191} placeholder="Örn. Ahmet Bey'in sepeti" />
            </div>
            <div className="field">
              <label htmlFor="pl-amount">Tutar (₺)</label>
              <input className="input" id="pl-amount" name="amount" required inputMode="decimal" placeholder="1.000,00" />
            </div>
            {sites.length > 1 ? (
              <div className="field">
                <label htmlFor="pl-site">Site</label>
                <select className="select" id="pl-site" name="tenant_id" defaultValue={sites[0]?.id}>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input type="hidden" name="tenant_id" value={sites[0]?.id ?? ""} />
            )}
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="pl-name">Müşteri adı (isteğe bağlı)</label>
              <input className="input" id="pl-name" name="customer_name" maxLength={191} />
            </div>
            <div className="field">
              <label htmlFor="pl-email">E-posta (isteğe bağlı)</label>
              <input className="input" id="pl-email" name="customer_email" type="email" maxLength={191} />
            </div>
            <div className="field">
              <label htmlFor="pl-phone">Telefon (isteğe bağlı)</label>
              <input className="input" id="pl-phone" name="customer_phone" type="tel" maxLength={32} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pl-desc">Açıklama (isteğe bağlı, müşteri görür)</label>
            <textarea className="input" id="pl-desc" name="description" rows={2} maxLength={2000} placeholder="Örn. Ön tampon ve far takımı" />
          </div>
          <div>
            <button className="btn btn-primary" type="submit">
              Bağlantı oluştur
            </button>
          </div>
        </form>
      </Panel>

      <TabNav
        label="Tahsilat durumları"
        active={filter}
        items={[
          { key: "all", label: "Tümü", href: "/payment-links?durum=all", count: stats.all },
          { key: "pending", label: "Ödeme bekleyen", href: "/payment-links?durum=pending", count: stats.pending },
          { key: "paid", label: "Ödenen", href: "/payment-links?durum=paid", count: stats.paid },
          { key: "cancelled", label: "İptal", href: "/payment-links?durum=cancelled", count: stats.cancelled },
        ]}
      />
      <Panel>
        {links.length === 0 ? (
          <EmptyState title="Tahsilat yok" description="Oluşturduğunuz ödeme bağlantıları burada listelenir." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>Ödeyen</th>
                  <th>Oluşturulma</th>
                  <th aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {links.map((l) => {
                  const url = linkUrl(l.tenant_id, l.code);
                  return (
                    <tr key={l.id}>
                      <td style={{ maxWidth: 280 }}>
                        <strong>{l.title}</strong>
                        {l.customer_name || l.customer_email || l.customer_phone ? (
                          <div className="muted text-sm">{[l.customer_name, l.customer_email, l.customer_phone].filter(Boolean).join(" · ")}</div>
                        ) : null}
                        {sites.length > 1 ? <div className="muted text-sm">{siteName.get(l.tenant_id) ?? "—"}</div> : null}
                      </td>
                      <td>
                        <strong>{formatTry(l.amount)}</strong>
                        {l.status === "paid" && l.paid_amount && Number(l.paid_amount) !== Number(l.amount) ? (
                          <div className="muted text-sm">
                            Çekilen {formatTry(l.paid_amount)}
                            {l.paid_installment && l.paid_installment > 1 ? ` · ${l.paid_installment} taksit` : ""}
                          </div>
                        ) : l.paid_installment && l.paid_installment > 1 ? (
                          <div className="muted text-sm">{l.paid_installment} taksit</div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge tone={STATUS[l.status]?.tone ?? "neutral"}>{STATUS[l.status]?.label ?? l.status}</StatusBadge>
                        {l.status === "paid" ? (
                          <div className="muted text-sm">{formatDate(l.paid_at)}</div>
                        ) : l.last_error ? (
                          <div className="muted text-sm" title={l.last_error}>
                            Son deneme: {l.last_error.slice(0, 60)}
                          </div>
                        ) : Number(l.attempts) > 0 ? (
                          <div className="muted text-sm">{l.attempts} deneme</div>
                        ) : null}
                      </td>
                      <td className="text-sm">
                        {l.payer_name ? <div>{l.payer_name}</div> : "—"}
                        {l.payer_email ? <div className="muted">{l.payer_email}</div> : null}
                        {l.status === "paid" && l.bank_ref ? <div className="muted mono">Ref: {l.bank_ref}</div> : null}
                      </td>
                      <td className="text-sm">
                        {formatDate(l.created_at)}
                        {l.created_by ? <div className="muted">{l.created_by}</div> : null}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {l.status === "pending" ? <CopyButton value={url} label="Bağlantıyı kopyala" /> : null}
                          <a className="btn btn-ghost btn-xs" href={url} target="_blank" rel="noreferrer">
                            Aç
                          </a>
                          <form action={withBase(`/api/payment-links/${l.id}`)} method="post" style={{ display: "contents" }}>
                            <input type="hidden" name="back" value={back} />
                            {l.status === "pending" ? (
                              <ConfirmButton className="btn btn-ghost btn-xs" name="_action" value="cancel" message="Bağlantı iptal edilsin mi? Müşteri artık ödeme yapamaz.">
                                İptal et
                              </ConfirmButton>
                            ) : null}
                            {l.status === "cancelled" ? (
                              <>
                                <button className="btn btn-ghost btn-xs" type="submit" name="_action" value="reopen">
                                  Yeniden aç
                                </button>
                                <ConfirmButton className="btn btn-ghost btn-xs" name="_action" value="delete" message="Tahsilat kaydı kalıcı olarak silinsin mi?">
                                  Sil
                                </ConfirmButton>
                              </>
                            ) : null}
                          </form>
                        </div>
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
