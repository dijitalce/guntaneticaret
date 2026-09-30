import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, segmentSizes, tenants, type Campaign } from "@guntan/db";
import { withBase } from "./paths";

const EMAIL_STARTER = `<h2>Merhaba {{customer_name}},</h2>
<p>Aracınız için ihtiyacınız olan yedek parçalarda bu haftaya özel fırsatlar sizi bekliyor.</p>
{{coupon_block}}
<p><a class="btn" href="{{site_url}}">Alışverişe başla</a></p>`;

function localInput(d: Date | null) {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
  return parts.replace(" ", "T");
}

export async function CampaignForm({ campaign, channel, segment }: { campaign?: Campaign; channel: "email" | "sms"; segment?: string }) {
  const [tenantRows, segments] = await Promise.all([
    db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name)),
    segmentSizes(),
  ]);
  const ch = campaign?.channel ?? channel;
  const action = withBase(campaign ? `/api/campaigns/${campaign.id}` : "/api/campaigns");

  return (
    <form action={action} method="post" className="form-stack">
      <input type="hidden" name="_action" value="save" />
      <input type="hidden" name="channel" value={ch} />
      <div className="form-row">
        <div className="field">
          <label htmlFor="c-name">Kampanya adı</label>
          <input className="input" id="c-name" name="name" required defaultValue={campaign?.name ?? ""} placeholder="Örn. Ekim fren bakım kampanyası" />
        </div>
        <div className="field">
          <label htmlFor="c-tenant">Site</label>
          <select className="input" id="c-tenant" name="tenantId" defaultValue={campaign?.tenant_id ?? ""}>
            <option value="">Tüm siteler (gönderen: kişinin sipariş verdiği site)</option>
            {tenantRows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Hedef kitle</label>
        <div className="choice-grid">
          {segments.map((s) => (
            <label key={s.key} className="choice">
              <input type="radio" name="segmentKey" value={s.key} defaultChecked={(campaign?.segment_key ?? segment ?? "all") === s.key} />
              <span>
                <strong>
                  {s.name} <span className="muted">· {s.reachable.toLocaleString("tr-TR")} kişi</span>
                </strong>
                {s.description ? <small>{s.description}</small> : null}
              </span>
            </label>
          ))}
        </div>
        <small className="field-hint">
          Yalnızca pazarlama iletisi izni olan ve abonelikten çıkmamış kişilere gönderilir. <Link href="/marketing/segments">Segmentleri yönet</Link>
        </small>
      </div>
      {ch === "email" ? (
        <>
          <div className="form-row">
            <div className="field">
              <label htmlFor="c-subject">Konu</label>
              <input className="input" id="c-subject" name="subject" required defaultValue={campaign?.subject ?? ""} placeholder="{{customer_name}}, size özel %10 indirim" />
            </div>
            <div className="field">
              <label htmlFor="c-pre">Ön izleme metni</label>
              <input className="input" id="c-pre" name="preheader" defaultValue={campaign?.preheader ?? ""} placeholder="Gelen kutusunda konunun yanında görünür" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="c-body">İçerik (HTML)</label>
            <textarea className="input mono" id="c-body" name="body" rows={12} required defaultValue={campaign?.body ?? EMAIL_STARTER} spellCheck={false} />
            <small className="field-hint">
              Değişkenler: {"{{customer_name}}, {{site_name}}, {{site_url}}, {{coupon_code}}, {{coupon_block}}"}. Bağlantılar otomatik izlenir ve UTM eklenir.
            </small>
          </div>
        </>
      ) : (
        <div className="field">
          <label htmlFor="c-sms">SMS metni</label>
          <textarea className="input" id="c-sms" name="body" rows={4} required maxLength={600} defaultValue={campaign?.body ?? "{{site_name}}: {{customer_name}}, size ozel %10 indirim! Kod: {{coupon_code}}"} />
          <small className="field-hint">Sonuna İYS ret bağlantısı otomatik eklenir. Sessiz saatlerde gönderim bekletilir.</small>
        </div>
      )}
      <div className="form-row">
        <div className="field">
          <label htmlFor="c-coupon">Kupon kodu (isteğe bağlı)</label>
          <input className="input" id="c-coupon" name="couponCode" defaultValue={campaign?.coupon_code ?? ""} placeholder="EKIM10" />
          <small className="field-hint">
            Önce <Link href="/marketing/coupons/new">Kuponlar</Link> bölümünde oluşturun.
          </small>
        </div>
        <div className="field">
          <label htmlFor="c-when">Zamanlanmış gönderim (isteğe bağlı)</label>
          <input className="input" id="c-when" name="scheduledAt" type="datetime-local" defaultValue={localInput(campaign?.scheduled_at ?? null)} />
          <small className="field-hint">Boş bırakırsanız “Gönder” dediğinizde başlar.</small>
        </div>
      </div>
      <div className="form-actions">
        <Link className="btn btn-ghost" href="/marketing/campaigns">
          Vazgeç
        </Link>
        <button className="btn btn-primary" type="submit">
          {campaign ? "Taslağı kaydet" : "Taslak oluştur"}
        </button>
      </div>
    </form>
  );
}
