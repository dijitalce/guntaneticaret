import { getMarketingSettings } from "@guntan/db";
import { MarketingNav } from "@/src/marketing-nav";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Pazarlama ayarları" };
export const dynamic = "force-dynamic";

export default async function MarketingSettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const s = await getMarketingSettings();
  const hours = Array.from({ length: 24 }, (_, h) => h);
  return (
    <>
      <PageHeader title="Pazarlama ayarları" description="Satış atfı, gönderim sıklığı ve SMS sessiz saatleri." />
      <MarketingNav active="settings" />
      {sp.ok ? <Alert tone="ok">Ayarlar kaydedildi.</Alert> : null}
      <form action={withBase("/api/marketing/settings")} method="post" className="form-page is-wide">
        <Panel title="Satış atfı" description="Bir siparişin kampanyaya sayılması için kural" padded>
          <div className="form-stack">
            <div className="choice-grid">
              <label className="choice">
                <input type="radio" name="attribution" value="click" defaultChecked={s.attribution === "click"} />
                <span>
                  <strong>Tıklamaya göre</strong>
                  <small>Müşteri mesajdaki bağlantıya tıklayıp sipariş verirse kampanyaya sayılır (önerilen, daha kesin).</small>
                </span>
              </label>
              <label className="choice">
                <input type="radio" name="attribution" value="open" defaultChecked={s.attribution === "open"} />
                <span>
                  <strong>Açılmaya göre</strong>
                  <small>E-postayı açıp belirli gün içinde sipariş verirse kampanyaya sayılır.</small>
                </span>
              </label>
            </div>
            <div className="field" style={{ maxWidth: 260 }}>
              <label htmlFor="attributionDays">Atıf süresi (gün)</label>
              <input className="input" id="attributionDays" name="attributionDays" type="number" min={1} max={30} defaultValue={s.attributionDays} />
            </div>
          </div>
        </Panel>
        <Panel title="Gönderim sıklığı" padded>
          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="frequencyHours">Aynı kişiye iki kampanya arasında en az (saat)</label>
            <input className="input" id="frequencyHours" name="frequencyHours" type="number" min={0} max={720} defaultValue={s.frequencyHours} />
            <small className="field-hint">0 = sınır yok. Sınıra takılan alıcılar “atlandı” olarak işaretlenir. Otomasyon ve sipariş bildirimleri etkilenmez.</small>
          </div>
        </Panel>
        <Panel title="SMS sessiz saatleri" description="İYS ve müşteri memnuniyeti için gece SMS gönderilmez" padded>
          <div className="form-row">
            <div className="field">
              <label htmlFor="smsQuietStart">Başlangıç</label>
              <select className="select" id="smsQuietStart" name="smsQuietStart" defaultValue={s.smsQuietStart}>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="smsQuietEnd">Bitiş</label>
              <select className="select" id="smsQuietEnd" name="smsQuietEnd" defaultValue={s.smsQuietEnd}>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="muted text-sm" style={{ margin: "0.5rem 0 0" }}>
            Bu saatler arasında kampanya SMS&apos;leri bekletilir, sessiz saat bitince gönderilir. Başlangıç ve bitiş aynıysa sınır uygulanmaz.
          </p>
        </Panel>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Ayarları kaydet
          </button>
        </div>
      </form>
    </>
  );
}
