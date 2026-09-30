import Link from "next/link";
import type { ReactNode } from "react";
import { automationStats, getAutomationSettings, getNotifySettings, recentAutomationRuns } from "@guntan/db";
import { IconZap } from "@/src/icons";
import { MarketingNav } from "@/src/marketing-nav";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { Toggle, relativeTime } from "@/src/ui-ext";

export const metadata = { title: "Otomasyonlar" };
export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  abandoned_cart: "Terk edilen sepet hatırlatması",
  review_request: "Değerlendirme isteği",
  low_stock: "Düşük stok uyarısı",
  back_in_stock: "Stoğa girdi bildirimi",
  bank_reminder: "Havale ödeme hatırlatması",
  bank_cancel: "Ödenmeyen havale siparişini iptal",
  campaigns: "Kampanya gönderim kuyruğu",
  prune: "Eski ziyaret kayıtlarını temizleme",
};

function Card({
  id,
  title,
  description,
  enabled,
  stats,
  templates,
  children,
}: {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  stats?: { runs: number; processed: number; sent: number; lastAt: Date | null };
  templates?: { key: string; label: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="panel automation-card" id={id}>
      <form action={withBase("/api/automations")} method="post">
        <input type="hidden" name="key" value={id} />
        <div className="panel-head">
          <div>
            <h2>
              {title} <StatusBadge tone={enabled ? "ok" : "neutral"}>{enabled ? "Açık" : "Kapalı"}</StatusBadge>
            </h2>
            <p>{description}</p>
          </div>
        </div>
        <div className="panel-pad form-stack">
          <Toggle name="enabled" defaultChecked={enabled} label="Otomasyonu çalıştır" />
          {children}
          <div className="automation-foot">
            <span className="muted text-sm">
              {stats ? `Son 30 gün: ${stats.sent} gönderim · ${stats.processed} işlem · son çalışma ${relativeTime(stats.lastAt)}` : "Henüz çalışmadı"}
            </span>
            <span className="op-actions">
              {templates?.map((t) => (
                <Link key={t.key} className="btn btn-ghost btn-sm" href={`/settings/notifications/${t.key}`}>
                  {t.label}
                </Link>
              ))}
              <button className="btn btn-primary btn-sm" type="submit">
                Kaydet
              </button>
            </span>
          </div>
        </div>
      </form>
    </section>
  );
}

export default async function AutomationsPage({ searchParams }: { searchParams: Promise<{ ok?: string; adet?: string }> }) {
  const sp = await searchParams;
  const [s, stats, runs, notify] = await Promise.all([getAutomationSettings(), automationStats(), recentAutomationRuns(25), getNotifySettings()]);
  const st = (k: string) => stats.byKey.get(k);
  const emailReady = notify.emailProvider !== "none" && Boolean(notify.emailApiKey);
  const production = process.env.NODE_ENV === "production" && process.env.AUTOMATIONS_DISABLED !== "1";

  return (
    <>
      <PageHeader
        title="Otomasyonlar"
        description="Belirli olaylarda müşterilere ve ekibinize otomatik e-posta/SMS gönderen ve siparişleri yöneten kurallar."
        actions={
          <form action={withBase("/api/automations")} method="post">
            <input type="hidden" name="_action" value="run" />
            <button className="btn btn-secondary" type="submit">
              <IconZap />
              Şimdi çalıştır
            </button>
          </form>
        }
      />
      <MarketingNav active="automations" />
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Otomasyon ayarı kaydedildi.</Alert> : null}
      {sp.ok === "calisti" ? <Alert tone="ok">Tüm otomasyonlar çalıştırıldı · {sp.adet ?? 0} mesaj gönderildi.</Alert> : null}
      {!emailReady ? (
        <Alert tone="warn">
          E-posta sağlayıcısı ayarlı değil; otomasyonlar çalışır ama e-posta gönderemez. <Link href="/settings/notifications?sekme=ayarlar">Bildirim ayarları</Link>
        </Alert>
      ) : null}
      <Panel padded>
        <div className="sync-status">
          <div className="sync-status-main">
            <span className={`sync-state is-${production ? "ok" : "warn"}`}>{production ? "Zamanlayıcı çalışıyor" : "Zamanlayıcı kapalı (geliştirme ortamı)"}</span>
            <span className="muted text-sm">
              Otomasyonlar sunucuda her dakika kontrol edilir (en az 4 dakika arayla çalışır). Son tur: {stats.lastRunAt ? relativeTime(stats.lastRunAt) : "henüz yok"}.
            </span>
          </div>
        </div>
      </Panel>

      <div className="automation-grid">
        <Card
          id="abandoned_cart"
          title={LABELS.abandoned_cart!}
          description="Sepetinde ürün bırakıp çıkan ve e-postası bilinen ziyaretçilere hatırlatma gönderir; bağlantı sepeti geri yükler."
          enabled={s.abandoned_cart.enabled}
          stats={st("abandoned_cart")}
          templates={[
            { key: "abandoned_cart", label: "1. e-posta" },
            { key: "abandoned_cart_2", label: "2. e-posta" },
          ]}
        >
          <div className="form-row">
            <div className="field">
              <label>İlk hatırlatma (dakika sonra)</label>
              <input className="input" name="delayMinutes" type="number" min={15} max={1440} defaultValue={s.abandoned_cart.delayMinutes} />
            </div>
            <div className="field">
              <label>İndirim kuponu (isteğe bağlı)</label>
              <input className="input" name="couponCode" defaultValue={s.abandoned_cart.couponCode} placeholder="SEPET10" />
            </div>
          </div>
          <Toggle name="secondEnabled" defaultChecked={s.abandoned_cart.secondEnabled} label="İkinci hatırlatma gönder" />
          <div className="field">
            <label>İkinci hatırlatma (ilkinden kaç saat sonra)</label>
            <input className="input" name="secondDelayHours" type="number" min={1} max={168} defaultValue={s.abandoned_cart.secondDelayHours} />
          </div>
          <Toggle name="sms" defaultChecked={s.abandoned_cart.sms} label="SMS de gönder" hint="Telefonu bilinen ziyaretçilere (sessiz saatlere uyulur)." />
        </Card>

        <Card
          id="bank_reminder"
          title={LABELS.bank_reminder!}
          description="Havale/EFT ile sipariş verip ödemeyi henüz yapmayan müşteriye banka bilgileriyle hatırlatma gönderir."
          enabled={s.bank_reminder.enabled}
          stats={st("bank_reminder")}
          templates={[{ key: "bank_reminder", label: "Şablon" }]}
        >
          <div className="field">
            <label>Siparişten kaç saat sonra</label>
            <input className="input" name="afterHours" type="number" min={1} max={240} defaultValue={s.bank_reminder.afterHours} />
          </div>
          <Toggle name="sms" defaultChecked={s.bank_reminder.sms} label="SMS de gönder" />
        </Card>

        <Card
          id="bank_cancel"
          title={LABELS.bank_cancel!}
          description="Belirtilen süre içinde ödemesi gelmeyen havale siparişlerini iptal eder, stok rezervasyonunu bırakır ve müşteriyi bilgilendirir."
          enabled={s.bank_cancel.enabled}
          stats={st("bank_cancel")}
          templates={[{ key: "bank_cancelled", label: "Şablon" }]}
        >
          <div className="field">
            <label>Siparişten kaç saat sonra iptal edilsin</label>
            <input className="input" name="afterHours" type="number" min={6} max={720} defaultValue={s.bank_cancel.afterHours} />
          </div>
        </Card>

        <Card
          id="back_in_stock"
          title={LABELS.back_in_stock!}
          description="Stokta olmayan ürün sayfasında “Gelince haber ver” diyen müşterilere ürün stoğa girince e-posta gönderir."
          enabled={s.back_in_stock.enabled}
          stats={st("back_in_stock")}
          templates={[{ key: "back_in_stock", label: "Şablon" }]}
        />

        <Card
          id="review_request"
          title={LABELS.review_request!}
          description="Teslim edilen siparişlerden belirli gün sonra müşteriden deneyimini paylaşmasını ister."
          enabled={s.review_request.enabled}
          stats={st("review_request")}
          templates={[{ key: "review_request", label: "Şablon" }]}
        >
          <div className="field">
            <label>Teslimattan kaç gün sonra</label>
            <input className="input" name="afterDays" type="number" min={1} max={60} defaultValue={s.review_request.afterDays} />
          </div>
        </Card>

        <Card
          id="low_stock"
          title={LABELS.low_stock!}
          description="Son 60 günde satılan ve stoğu eşik değerin altına düşen ürünleri günde bir kez ekibinize e-postayla bildirir."
          enabled={s.low_stock.enabled}
          stats={st("low_stock")}
          templates={[{ key: "low_stock_admin", label: "Şablon" }]}
        >
          <div className="form-row">
            <div className="field">
              <label>Stok eşiği (adet)</label>
              <input className="input" name="threshold" type="number" min={0} defaultValue={s.low_stock.threshold} />
            </div>
            <div className="field">
              <label>Ek alıcılar</label>
              <input className="input" name="emails" defaultValue={s.low_stock.emails} placeholder="depo@firma.com" />
            </div>
          </div>
        </Card>
      </div>

      <Panel title="Son çalışmalar">
        {runs.length === 0 ? (
          <EmptyState title="Henüz çalışma kaydı yok" description="Otomasyonlar iş yaptığında burada listelenir." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Otomasyon</th>
                  <th>İşlenen</th>
                  <th>Gönderilen</th>
                  <th>Not</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="text-sm">{formatDate(r.created_at)}</td>
                    <td>{LABELS[r.automation] ?? r.automation}</td>
                    <td>{Number(r.processed)}</td>
                    <td>{Number(r.sent)}</td>
                    <td className="text-sm muted">{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
