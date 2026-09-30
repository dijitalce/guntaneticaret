import { arasConfigFromEnv } from "@guntan/ecommerce";
import { getShippingSettings } from "@guntan/db";
import { IconPrinter } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel, StatusBadge, formatTry } from "@/src/ui";
import { Toggle } from "@/src/ui-ext";

export const metadata = { title: "Kargo ayarları" };
export const dynamic = "force-dynamic";

export default async function ShippingSettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const s = await getShippingSettings();
  const aras = arasConfigFromEnv();
  const num = (v: number) => String(v).replace(".", ",");

  return (
    <>
      <PageHeader title="Kargo ayarları" description="Kargo ücreti, ücretsiz kargo limiti, gönderici bilgileri ve kargo etiketi düzeni." />
      {sp.ok ? <Alert tone="ok">Kargo ayarları kaydedildi. Yeni ücretler sepette ve ödeme sayfasında hemen geçerli olur.</Alert> : null}
      <form action={withBase("/api/settings/shipping")} method="post" className="grid-2">
        <div>
          <Panel title="Kargo ücreti" description="Tüm sitelerde sepet ve ödeme adımında uygulanır" padded>
            <div className="form-stack">
              <div className="form-row">
                <div className="field">
                  <label htmlFor="flatFee">Sabit kargo ücreti (TL)</label>
                  <input className="input" id="flatFee" name="flatFee" inputMode="decimal" defaultValue={num(s.flatFee)} />
                </div>
                <div className="field">
                  <label htmlFor="freeShippingThreshold">Ücretsiz kargo limiti (TL)</label>
                  <input className="input" id="freeShippingThreshold" name="freeShippingThreshold" inputMode="decimal" defaultValue={num(s.freeShippingThreshold)} />
                  <small className="field-hint">0 = ücretsiz kargo yok. Örn. 1500 yazarsanız 1.500 TL ve üzeri siparişte kargo ücretsiz olur.</small>
                </div>
              </div>
              <div className="field">
                <label htmlFor="estimatedDays">Tahmini teslim süresi</label>
                <input className="input" id="estimatedDays" name="estimatedDays" defaultValue={s.estimatedDays} placeholder="1-3 iş günü" />
              </div>
              <p className="muted text-sm" style={{ margin: 0 }}>
                Şu an: {s.flatFee > 0 ? formatTry(s.flatFee) : "Ücretsiz"}
                {s.freeShippingThreshold > 0 ? ` · ${formatTry(s.freeShippingThreshold)} üzeri ücretsiz` : ""}
              </p>
            </div>
          </Panel>

          <Panel
            title="Kargo firması"
            padded
            action={aras ? <StatusBadge tone={aras.mode === "TEST" ? "warn" : "ok"}>Aras {aras.mode === "TEST" ? "test" : "canlı"}</StatusBadge> : <StatusBadge>Aras bağlı değil</StatusBadge>}
          >
            <div className="form-stack">
              <div className="choice-grid">
                <label className="choice">
                  <input type="radio" name="defaultCarrier" value="aras" defaultChecked={s.defaultCarrier === "aras"} />
                  <span>
                    <strong>Aras Kargo entegrasyonu</strong>
                    <small>Sipariş detayından tek tıkla Aras&apos;ta gönderi açılır, takip numarası otomatik gelir.</small>
                  </span>
                </label>
                <label className="choice">
                  <input type="radio" name="defaultCarrier" value="manual" defaultChecked={s.defaultCarrier === "manual"} />
                  <span>
                    <strong>Elle giriş</strong>
                    <small>Farklı firma ile gönderip takip numarasını elle girersiniz.</small>
                  </span>
                </label>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="defaultPieces">Varsayılan koli</label>
                  <input className="input" id="defaultPieces" name="defaultPieces" type="number" min={1} defaultValue={s.defaultPieces} />
                </div>
                <div className="field">
                  <label htmlFor="defaultWeightKg">Varsayılan ağırlık (kg)</label>
                  <input className="input" id="defaultWeightKg" name="defaultWeightKg" inputMode="decimal" defaultValue={num(s.defaultWeightKg)} />
                </div>
              </div>
              {!aras ? (
                <p className="muted text-sm" style={{ margin: 0 }}>
                  Aras entegrasyonu için sunucudaki ortam değişkenlerine Aras kullanıcı bilgilerinin girilmesi gerekir.
                </p>
              ) : null}
            </div>
          </Panel>
        </div>

        <div>
          <Panel title="Gönderici bilgileri" description="Kargo etiketinde gönderici olarak yazılır" padded>
            <div className="form-stack">
              <div className="form-row">
                <div className="field">
                  <label htmlFor="senderName">Firma / gönderici adı</label>
                  <input className="input" id="senderName" name="senderName" defaultValue={s.senderName} placeholder="Boşsa site adı kullanılır" />
                </div>
                <div className="field">
                  <label htmlFor="senderPhone">Telefon</label>
                  <input className="input" id="senderPhone" name="senderPhone" defaultValue={s.senderPhone} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="senderAddress">Adres</label>
                <input className="input" id="senderAddress" name="senderAddress" defaultValue={s.senderAddress} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="senderDistrict">İlçe</label>
                  <input className="input" id="senderDistrict" name="senderDistrict" defaultValue={s.senderDistrict} />
                </div>
                <div className="field">
                  <label htmlFor="senderCity">İl</label>
                  <input className="input" id="senderCity" name="senderCity" defaultValue={s.senderCity} />
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Kargo etiketi" description="Sipariş detayındaki ve listedeki “etiket yazdır” çıktısı" padded>
            <div className="form-stack">
              <div className="field">
                <label>Etiket boyutu</label>
                <div className="choice-grid is-3">
                  {[
                    { v: "100x150", l: "10 × 15 cm", h: "Termal etiket yazıcı (önerilen)" },
                    { v: "100x100", l: "10 × 10 cm", h: "Kare termal etiket" },
                    { v: "a4", l: "A4", h: "Normal yazıcı" },
                  ].map((o) => (
                    <label key={o.v} className="choice">
                      <input type="radio" name="labelSize" value={o.v} defaultChecked={s.labelSize === o.v} />
                      <span>
                        <strong>{o.l}</strong>
                        <small>{o.h}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <Toggle name="labelShowItems" defaultChecked={s.labelShowItems} label="Ürün listesini göster" hint="Stok kodu ve adetler etikette yazar; paketlemede kontrol kolaylaşır." />
              <Toggle name="labelShowPrice" defaultChecked={s.labelShowPrice} label="Sipariş tutarını göster" />
              <div className="field">
                <label htmlFor="labelNote">Etiket alt notu</label>
                <input className="input" id="labelNote" name="labelNote" defaultValue={s.labelNote} placeholder="Örn. Kırılacak eşya, dikkatli taşıyınız" />
              </div>
              <p className="muted text-sm" style={{ margin: 0, display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <IconPrinter width={14} height={14} /> Barkod: takip numarası varsa takip no, yoksa sipariş numarası (Code 128).
              </p>
            </div>
          </Panel>
          <div className="form-actions sticky-actions">
            <button className="btn btn-primary" type="submit">
              Ayarları kaydet
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
