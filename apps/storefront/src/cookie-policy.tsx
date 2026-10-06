import Link from "next/link";
import { COMPANY_ADDRESS, COMPANY_CONTACT } from "@guntan/db/content/contact";
import { CookieSettingsLink } from "./cookie-consent";

export const CEREZ_TITLE = "Çerez Politikası";

type Row = { name: string; provider: string; purpose: string; duration: string };

const NECESSARY: Row[] = [
  { name: "guntan_cart", provider: "Bu site", purpose: "Sepetinizdeki ürünleri hatırlar.", duration: "30 gün" },
  { name: "guntan_customer", provider: "Bu site", purpose: "Hesabınıza giriş yaptığınızda oturumunuzu sürdürür.", duration: "14 gün" },
  { name: "gt_consent", provider: "Bu site", purpose: "Çerez tercihlerinizi saklar.", duration: "6 ay" },
  { name: "gt_popup_* (yerel depolama)", provider: "Bu site", purpose: "Kampanya penceresinin size tekrar tekrar gösterilmemesini sağlar.", duration: "Siz silene kadar" },
];

const ANALYTICS: Row[] = [
  { name: "gt_sid", provider: "Bu site", purpose: "Ziyaret oturumunu sayarak hangi sayfaların görüntülendiğini ölçer.", duration: "30 dakika" },
  { name: "_ga, _ga_*", provider: "Google Analytics", purpose: "Ziyaretçi sayısı ve site kullanımına ilişkin istatistik üretir.", duration: "2 yıla kadar" },
];

const MARKETING: Row[] = [
  { name: "_gcl_*", provider: "Google Ads", purpose: "Reklam tıklamalarını ve dönüşümleri ölçer.", duration: "90 gün" },
  { name: "_fbp, _fbc", provider: "Meta (Facebook, Instagram)", purpose: "Reklam gösterimini ve kampanya sonuçlarını ölçer.", duration: "90 gün" },
  { name: "_ttp", provider: "TikTok", purpose: "Reklam gösterimini ve kampanya sonuçlarını ölçer.", duration: "13 aya kadar" },
];

function CookieTable({ rows }: { rows: Row[] }) {
  return (
    <div className="table-scroll">
      <table className="fitment-table">
        <thead>
          <tr>
            <th>Çerez</th>
            <th>Sağlayıcı</th>
            <th>Amaç</th>
            <th>Süre</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td><code>{r.name}</code></td>
              <td>{r.provider}</td>
              <td>{r.purpose}</td>
              <td>{r.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CookiePolicy({ siteName }: { siteName: string }) {
  return (
    <article className="container page-surface cms-prose">
      <h1>{CEREZ_TITLE}</h1>
      <p>
        Bu politika, {siteName} internet sitesinde kullanılan çerezleri ve benzeri teknolojileri, bunların hangi amaçlarla kullanıldığını
        ve tercihlerinizi nasıl yönetebileceğinizi 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında açıklar. Veri sorumlusu{" "}
        {COMPANY_CONTACT.legalName}’dır ({COMPANY_ADDRESS}).
      </p>

      <h2>Çerez nedir?</h2>
      <p>
        Çerezler, bir internet sitesini ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır. Sepetinizin korunması,
        oturumunuzun sürdürülmesi ve izin vermeniz halinde sitenin nasıl kullanıldığının ölçülmesi ile reklamların kişiselleştirilmesi
        gibi amaçlarla kullanılırlar.
      </p>

      <h2>Hangi çerezleri kullanıyoruz?</h2>
      <h3>Zorunlu çerezler</h3>
      <p>
        Sitenin çalışması, sepet ve sipariş işlemleri ile güvenlik için gereklidir. Bu çerezler KVKK m.5/2 (c) ve (f) kapsamında
        sözleşmenin kurulması ve ifası ile meşru menfaat hukuki sebeplerine dayanır ve onayınız aranmaz.
      </p>
      <CookieTable rows={NECESSARY} />

      <h3>Analitik çerezler</h3>
      <p>Ziyaret sayısını ve sayfaların nasıl kullanıldığını ölçerek siteyi geliştirmemize yardımcı olur. Yalnızca açık rızanızla kullanılır.</p>
      <CookieTable rows={ANALYTICS} />

      <h3>Pazarlama çerezleri</h3>
      <p>
        İlgi alanlarınıza uygun reklamların gösterilmesi ve kampanyaların ölçülmesi için iş ortaklarımız tarafından yerleştirilir. Ödeme
        sayfasında girdiğiniz iletişim bilgisinin, siparişi tamamlamadığınız durumda hatırlatma göndermek için kaydedilmesi de bu izne
        bağlıdır. Yalnızca açık rızanızla kullanılır.
      </p>
      <CookieTable rows={MARKETING} />

      <h2>Yurt dışına aktarım</h2>
      <p>
        Analitik ve pazarlama çerezleri aracılığıyla toplanan veriler, Google, Meta ve TikTok gibi sunucuları yurt dışında bulunan hizmet
        sağlayıcılara aktarılabilir. Bu aktarım, ilgili çerezlere izin vermeniz halinde KVKK m.9 kapsamındaki açık rızanıza dayanır.
      </p>

      <h2>Tercihlerinizi nasıl yönetirsiniz?</h2>
      <p>
        Siteye ilk girişinizde çıkan bant üzerinden tüm çerezleri kabul edebilir, reddedebilir veya kategori bazında seçim yapabilirsiniz.
        Kararınızı dilediğiniz zaman sayfanın altındaki “Çerez tercihleri” bağlantısından ya da buradan değiştirebilirsiniz:{" "}
        <CookieSettingsLink className="link-btn" />. Ayrıca tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz; zorunlu
        çerezlerin engellenmesi halinde sepet ve sipariş işlemleri çalışmayabilir.
      </p>

      <h2>Haklarınız</h2>
      <p>
        KVKK m.11 kapsamındaki haklarınıza ve kişisel verilerinizin işlenmesine ilişkin ayrıntılara <Link href="/sayfa/gizlilik">Gizlilik</Link>{" "}
        sayfamızdan ulaşabilir, taleplerinizi <a href={`mailto:${COMPANY_CONTACT.email}`}>{COMPANY_CONTACT.email}</a> adresine
        iletebilirsiniz.
      </p>
    </article>
  );
}
