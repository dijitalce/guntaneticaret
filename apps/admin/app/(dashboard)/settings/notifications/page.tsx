import Link from "next/link";
import { sql } from "drizzle-orm";
import { TEMPLATES, TEMPLATE_GROUPS, ensureExtTables, extRows, getNotifySettings, getTemplateOverrides } from "@guntan/db";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { Pager, TabNav, pageNumber } from "@/src/ui-ext";

export const metadata = { title: "Bildirimler" };
export const dynamic = "force-dynamic";

const MASK = "••••••••";
const STATUS_LABEL: Record<string, string> = { sent: "Gönderildi", failed: "Hata", skipped: "Atlandı", queued: "Sırada" };

type LogRow = {
  id: string;
  channel: string;
  recipient: string;
  subject: string | null;
  template_key: string | null;
  status: string;
  error: string | null;
  created_at: Date;
  opened_at: Date | null;
  clicked_at: Date | null;
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ sekme?: string; ok?: string; hata?: string; sayfa?: string; durum?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.sekme ?? "orders";
  await ensureExtTables();
  const [settings, overrides, stats] = await Promise.all([
    getNotifySettings(),
    getTemplateOverrides(),
    extRows<{ sent: number; failed: number; skipped: number; opened: number; emails: number }>(sql`select
      sum(status = 'sent') sent, sum(status = 'failed') failed, sum(status = 'skipped') skipped,
      sum(opened_at is not null) opened, sum(channel = 'email' and status = 'sent') emails
      from message_log where created_at > now() - interval 30 day and campaign_id is null`),
  ]);
  const s = stats[0];
  const emailReady = settings.emailProvider !== "none" && Boolean(settings.emailApiKey && settings.fromEmail);
  const smsReady = settings.smsProvider === "netgsm" && Boolean(settings.netgsmUser && settings.netgsmPass && settings.netgsmHeader);

  const page = pageNumber(sp.sayfa);
  const PER = 50;
  let logs: LogRow[] = [];
  let logTotal = 0;
  if (tab === "gecmis") {
    const where = sp.durum ? sql`where campaign_id is null and status = ${sp.durum}` : sql`where campaign_id is null`;
    logs = await extRows<LogRow>(
      sql`select id, channel, recipient, subject, template_key, status, error, created_at, opened_at, clicked_at from message_log ${where} order by created_at desc limit ${PER} offset ${(page - 1) * PER}`,
    );
    const [c] = await extRows<{ c: number }>(sql`select count(*) c from message_log ${where}`);
    logTotal = Number(c?.c ?? 0);
  }

  const tabs = [
    ...TEMPLATE_GROUPS.map((g) => ({ key: g.key, label: g.label, href: `/settings/notifications?sekme=${g.key}`, count: TEMPLATES.filter((t) => t.group === g.key).length })),
    { key: "ayarlar", label: "E-posta ve SMS ayarları", href: "/settings/notifications?sekme=ayarlar" },
    { key: "gecmis", label: "Gönderim geçmişi", href: "/settings/notifications?sekme=gecmis" },
  ];
  const groupTemplates = TEMPLATES.filter((t) => t.group === tab);
  const labelOf = (key: string | null) => TEMPLATES.find((t) => t.key === key)?.label ?? key ?? "—";

  return (
    <>
      <PageHeader title="Bildirimler" description="Müşterilere ve ekibinize giden e-posta ve SMS bildirimleri, şablonları ve gönderim geçmişi." />
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Kaydedildi.</Alert> : null}
      {sp.ok === "test" ? <Alert tone="ok">Test mesajı gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {!emailReady ? (
        <Alert tone="warn">
          E-posta sağlayıcısı ayarlı değil; şu an hiçbir e-posta gönderilmiyor (gönderimler “Atlandı” olarak kaydediliyor).{" "}
          <Link href="/settings/notifications?sekme=ayarlar">Ayarları yapın</Link>.
        </Alert>
      ) : null}

      <div className="kpis">
        <Kpi label="Gönderilen (30 gün)" value={Number(s?.sent ?? 0).toLocaleString("tr-TR")} tone="ok" />
        <Kpi label="Atlanan (30 gün)" value={Number(s?.skipped ?? 0).toLocaleString("tr-TR")} hint="sağlayıcı kapalıyken" />
        <Kpi label="Hatalı" value={Number(s?.failed ?? 0)} tone={Number(s?.failed ?? 0) ? "warn" : undefined} />
        <Kpi
          label="Kanallar"
          value={
            <span className="channel-badges">
              <StatusBadge tone={emailReady ? "ok" : "bad"}>E-posta {emailReady ? "açık" : "kapalı"}</StatusBadge>
              <StatusBadge tone={smsReady ? "ok" : "bad"}>SMS {smsReady ? "açık" : "kapalı"}</StatusBadge>
            </span>
          }
        />
      </div>

      <TabNav label="Bildirim bölümleri" active={tab} items={tabs} />

      {groupTemplates.length ? (
        <Panel>
          <form action={withBase("/api/settings/notifications")} method="post">
            <input type="hidden" name="_action" value="toggles" />
            <input type="hidden" name="group" value={tab} />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bildirim</th>
                    <th style={{ width: 90 }}>E-posta</th>
                    <th style={{ width: 90 }}>SMS</th>
                    <th style={{ width: 110 }} />
                  </tr>
                </thead>
                <tbody>
                  {groupTemplates.map((t) => {
                    const o = overrides[t.key] ?? {};
                    const customized = Boolean(o.subject || o.body || o.smsBody);
                    return (
                      <tr key={t.key}>
                        <td>
                          <Link href={`/settings/notifications/${t.key}`}>
                            <strong>{t.label}</strong>
                          </Link>
                          {customized ? (
                            <>
                              {" "}
                              <StatusBadge tone="violet">Özelleştirildi</StatusBadge>
                            </>
                          ) : null}
                          {t.marketing ? (
                            <>
                              {" "}
                              <StatusBadge tone="info">Pazarlama</StatusBadge>
                            </>
                          ) : null}
                          <div className="muted text-sm">{t.description}</div>
                        </td>
                        <td>
                          <label className="switch-inline">
                            <input type="checkbox" name={`${t.key}.email`} value="1" defaultChecked={o.email ?? t.email} />
                            <span className="switch" aria-hidden />
                          </label>
                        </td>
                        <td>
                          <label className="switch-inline">
                            <input type="checkbox" name={`${t.key}.sms`} value="1" defaultChecked={o.sms ?? t.sms} />
                            <span className="switch" aria-hidden />
                          </label>
                        </td>
                        <td>
                          <Link className="btn btn-secondary btn-sm" href={`/settings/notifications/${t.key}`}>
                            Düzenle
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="form-actions panel-pad">
              <button className="btn btn-primary" type="submit">
                Açık/kapalı durumlarını kaydet
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {tab === "ayarlar" ? (
        <div className="grid-halves">
          <Panel title="E-posta" description="Resend veya Brevo hesabınızın API anahtarı" padded>
            <form action={withBase("/api/settings/notifications")} method="post" className="form-stack">
              <input type="hidden" name="_action" value="provider" />
              <div className="field">
                <label htmlFor="emailProvider">Sağlayıcı</label>
                <select className="input" id="emailProvider" name="emailProvider" defaultValue={settings.emailProvider}>
                  <option value="none">Kapalı</option>
                  <option value="resend">Resend</option>
                  <option value="brevo">Brevo (Sendinblue)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="emailApiKey">API anahtarı</label>
                <input className="input" id="emailApiKey" name="emailApiKey" type="password" defaultValue={settings.emailApiKey ? MASK : ""} autoComplete="off" />
                <small className="field-hint">Kayıtlı anahtar gizli gösterilir; değiştirmek için yenisini yapıştırın.</small>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="fromEmail">Gönderen e-posta</label>
                  <input className="input" id="fromEmail" name="fromEmail" type="email" defaultValue={settings.fromEmail} placeholder="siparis@alanadiniz.com" />
                  <small className="field-hint">Alan adı sağlayıcıda doğrulanmış olmalı.</small>
                </div>
                <div className="field">
                  <label htmlFor="fromName">Gönderen adı</label>
                  <input className="input" id="fromName" name="fromName" defaultValue={settings.fromName} placeholder="Boşsa site adı" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="replyTo">Yanıt adresi</label>
                <input className="input" id="replyTo" name="replyTo" type="email" defaultValue={settings.replyTo} />
              </div>
              <div className="field">
                <label htmlFor="adminEmails">Yönetici bildirim adresleri</label>
                <input className="input" id="adminEmails" name="adminEmails" defaultValue={settings.adminEmails} placeholder="ali@firma.com, depo@firma.com" />
                <small className="field-hint">Yeni sipariş ve düşük stok e-postaları bu adreslere gider.</small>
              </div>
              <h3 className="subhead">SMS (Netgsm)</h3>
              <div className="field">
                <label htmlFor="smsProvider">Sağlayıcı</label>
                <select className="input" id="smsProvider" name="smsProvider" defaultValue={settings.smsProvider}>
                  <option value="none">Kapalı</option>
                  <option value="netgsm">Netgsm</option>
                </select>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="netgsmUser">Kullanıcı adı</label>
                  <input className="input" id="netgsmUser" name="netgsmUser" defaultValue={settings.netgsmUser} autoComplete="off" />
                </div>
                <div className="field">
                  <label htmlFor="netgsmPass">Şifre</label>
                  <input className="input" id="netgsmPass" name="netgsmPass" type="password" defaultValue={settings.netgsmPass ? MASK : ""} autoComplete="off" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="netgsmHeader">Mesaj başlığı</label>
                <input className="input" id="netgsmHeader" name="netgsmHeader" defaultValue={settings.netgsmHeader} placeholder="Onaylı başlık (örn. FIRMAADI)" />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  Ayarları kaydet
                </button>
              </div>
            </form>
          </Panel>
          <div>
            <Panel title="Test gönder" padded>
              <form action={withBase("/api/settings/notifications")} method="post" className="form-stack">
                <div className="field">
                  <label htmlFor="test-to">Alıcı (e-posta veya telefon)</label>
                  <input className="input" id="test-to" name="to" required placeholder="siz@firma.com veya 05xx…" />
                </div>
                <div className="op-actions">
                  <button className="btn btn-secondary" type="submit" name="_action" value="test_email" disabled={!emailReady}>
                    Test e-postası
                  </button>
                  <button className="btn btn-secondary" type="submit" name="_action" value="test_sms" disabled={!smsReady}>
                    Test SMS
                  </button>
                </div>
              </form>
            </Panel>
            <Panel title="Nasıl çalışır?" padded>
              <ul className="note-list">
                <li>Sipariş, ödeme, kargo, teslim ve iptal adımlarında müşteriye otomatik bildirim gider.</li>
                <li>Her gönderim “Gönderim geçmişi” sekmesinde ve sipariş zaman çizelgesinde görünür.</li>
                <li>Şablonlarda {"{{customer_name}}"}, {"{{order_no}}"} gibi değişkenler kullanılabilir.</li>
                <li>Pazarlama e-postalarına otomatik “abonelikten çık” bağlantısı eklenir.</li>
              </ul>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "gecmis" ? (
        <Panel>
          <nav className="toolbar filter-bar" aria-label="Durum">
            {[
              { k: "", l: "Tümü" },
              { k: "sent", l: "Gönderildi" },
              { k: "failed", l: "Hatalı" },
              { k: "skipped", l: "Atlandı" },
            ].map((f) => (
              <Link key={f.k} className={`btn btn-sm ${(sp.durum ?? "") === f.k ? "btn-primary" : "btn-secondary"}`} href={`/settings/notifications?sekme=gecmis${f.k ? `&durum=${f.k}` : ""}`}>
                {f.l}
              </Link>
            ))}
          </nav>
          {logs.length === 0 ? (
            <EmptyState title="Gönderim kaydı yok" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Zaman</th>
                    <th>Bildirim</th>
                    <th>Alıcı</th>
                    <th>Durum</th>
                    <th>Etkileşim</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="text-sm" style={{ whiteSpace: "nowrap" }}>
                        {formatDate(l.created_at)}
                      </td>
                      <td className="text-sm">
                        <strong>{labelOf(l.template_key)}</strong>
                        <div className="muted">{l.subject}</div>
                      </td>
                      <td className="text-sm">
                        <StatusBadge tone="neutral">{l.channel === "sms" ? "SMS" : "E-posta"}</StatusBadge> {l.recipient}
                      </td>
                      <td>
                        <StatusBadge tone={l.status === "sent" ? "ok" : l.status === "failed" ? "bad" : "neutral"}>{STATUS_LABEL[l.status] ?? l.status}</StatusBadge>
                        {l.error ? <div className="muted text-sm" title={l.error}>{l.error.slice(0, 80)}</div> : null}
                      </td>
                      <td className="text-sm">{l.clicked_at ? "Tıkladı" : l.opened_at ? "Açtı" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager base="/settings/notifications" page={page} total={logTotal} perPage={PER} params={{ sekme: "gecmis", durum: sp.durum }} />
        </Panel>
      ) : null}
    </>
  );
}
