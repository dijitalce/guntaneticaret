import { getPaymentSettings } from "@guntan/db";
import { withBase } from "@/src/paths";
import { Alert, PageHeader, Panel, StatusBadge, formatTry } from "@/src/ui";

export const metadata = { title: "Ödeme ve taksit" };
export const dynamic = "force-dynamic";

const COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SAMPLE = 1000;

function num(v: number) {
  return String(v).replace(".", ",");
}

export default async function PaymentSettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const s = await getPaymentSettings();
  const active = COUNTS.filter((n) => s.installmentRates[String(n)] !== undefined);

  return (
    <>
      <PageHeader
        title="Ödeme ve taksit"
        description="Kredi kartı taksit seçenekleri ve vade farkı oranları. Ürün sayfasındaki taksit tablosu, sepet ve ödeme adımı bu oranlarla hesaplanır."
      />
      {sp.ok ? <Alert tone="ok">Taksit ayarları kaydedildi. Ödeme adımında hemen, ürün sayfalarında en geç 5 dakika içinde geçerli olur.</Alert> : null}
      <form action={withBase("/api/settings/payment")} method="post" className="grid-2">
        <div>
          <Panel
            title="Taksit oranları"
            description="Bankanın size uyguladığı vade farkını yüzde olarak girin. Boş bırakılan taksit müşteriye gösterilmez; 0 yazarsanız vade farksız olur."
            padded
            action={
              active.length > 0 ? (
                <StatusBadge tone="ok">{Math.max(...active)} aya kadar açık</StatusBadge>
              ) : (
                <StatusBadge>Sadece tek çekim</StatusBadge>
              )
            }
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Taksit</th>
                  <th>Vade farkı (%)</th>
                  <th>{formatTry(SAMPLE)} için aylık</th>
                </tr>
              </thead>
              <tbody>
                {COUNTS.map((n) => {
                  const rate = s.installmentRates[String(n)];
                  const total = rate === undefined ? null : SAMPLE * (1 + rate / 100);
                  return (
                    <tr key={n}>
                      <td>
                        <label htmlFor={`rate-${n}`}>{n} taksit</label>
                      </td>
                      <td>
                        <input
                          className="input"
                          id={`rate-${n}`}
                          name={`rate-${n}`}
                          inputMode="decimal"
                          placeholder="Kapalı"
                          defaultValue={rate === undefined ? "" : num(rate)}
                          style={{ maxWidth: "8rem" }}
                        />
                      </td>
                      <td className="muted">{total == null ? "—" : `${formatTry(total / n)} × ${n} = ${formatTry(total)}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </div>

        <div>
          <Panel title="Taksit alt sınırı" description="Bu tutarın altındaki sepetlerde ve ürünlerde yalnızca tek çekim gösterilir" padded>
            <div className="form-stack">
              <div className="field">
                <label htmlFor="installmentMinAmount">En düşük tutar (TL)</label>
                <input
                  className="input"
                  id="installmentMinAmount"
                  name="installmentMinAmount"
                  inputMode="decimal"
                  defaultValue={num(s.installmentMinAmount)}
                />
                <small className="field-hint">0 = her tutarda taksit. Örn. 500 yazarsanız 500 TL ve üzerinde taksit açılır.</small>
              </div>
            </div>
          </Panel>
          <Panel title="Nasıl görünür?" padded>
            <p className="muted text-sm" style={{ margin: 0 }}>
              Ürün sayfasındaki “Taksit seçenekleri” sekmesinde kart programları (Axess, Bonus, Maximum, World, Paraf,
              CardFinans, Bankkart) için aylık tutarlar listelenir. Oranlar tüm kartlar için aynıdır; müşteri taksiti ödeme
              adımında seçer ve çekilen tutar bu tablodaki toplamla birebir aynıdır. Hiç oran girilmezse sunucudaki eski taksit
              ayarı kullanılır.
            </p>
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
