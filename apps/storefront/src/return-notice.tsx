import type { ReactNode } from "react";
import { IconBox } from "./icons";
import { PolicyDialog } from "./policy-dialog";

function Legal({ children }: { children: ReactNode }) {
  return (
    <p className="policy-legal">
      <b>Yasal dayanak:</b> {children}
    </p>
  );
}

export function ReturnPolicyNotice({ whatsapp, phone }: { whatsapp: string | null; phone: string | null }) {
  const contact = whatsapp ? (
    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
      WhatsApp
    </a>
  ) : null;
  return (
    <PolicyDialog
      trigger={
        <>
          <IconBox />
          <span>
            Orijinal ambalajında, sıfır gönderilir — <u>iade koşulları</u>
          </span>
        </>
      }
      title="Ürünlerinizi sıfır gönderiyoruz — iade ederken de sıfır kalsın"
      subtitle="İade ve değişim koşulları · Mesafeli Sözleşmeler Yönetmeliği kapsamında"
      moreHref="/sayfa/iade"
      moreLabel="Tüm iade ve değişim koşulları"
    >
      <div className="policy-intro">
        <p>
          Size gönderdiğimiz her parça orijinal üretici ambalajında, hiç açılmamış, sıfır çıkar. Kutunun üzerine bant
          çekmez, yazı yazmaz, kargo etiketi yapıştırmayız — parçayı kolinin içine ayrıca koyarız. Bunu sizin için
          yapıyoruz: aldığınız parçanın gerçekten yeni olduğundan emin olun istiyoruz.
        </p>
        <p>
          İade ederken de aynı özeni rica ediyoruz. Çünkü geri gelen parça, ambalajı bozulmuşsa bir daha kimseye sıfır
          olarak satılamaz.
        </p>
      </div>

      <section className="policy-step">
        <h3><span>1</span>14 gün içinde iade hakkınız var</h3>
        <p>
          Ürünü teslim aldığınız tarihten itibaren <b>14 gün</b> içinde, hiçbir gerekçe göstermeden ve ceza ödemeden
          siparişinizden cayabilirsiniz. Süre dolduktan sonra cayma hakkı kullanılamaz.
        </p>
        <p>
          İadenizi, talep onaylandığında size verilen anlaşmalı kargo kodumuzla gönderirsiniz. Bu kodla gönderdiğiniz
          iadelerde <b>kargo ücreti bize aittir</b> — iade sebebi ne olursa olsun.
        </p>
        <p>
          Ambalajı açıp parçayı inceleyebilirsiniz — doğru parça mı, aracınıza uyuyor mu diye bakmanız hakkınızdır ve
          iadenizi engellemez. Engelleyen şey inceleme değil, parçanın takılması ya da ambalajının tahrip edilmesidir.
        </p>
      </section>

      <section className="policy-step">
        <h3><span>2</span>İadeyi nasıl paketlemelisiniz?</h3>
        <ul className="policy-list">
          <li>
            <b>Ürünün orijinal kutusunu kargo kolisi olarak kullanmayın.</b> Parçayı kendi kutusuyla birlikte ayrı bir
            koliye koyun. Size gönderirken biz de böyle yapıyoruz.
          </li>
          <li>Orijinal kutunun üzerinde bant, ip, yazı veya etiket olmamalı. Kargo etiketi dıştaki koliye yapıştırılmalı.</li>
          <li>
            Kutuyu iple bağlamayın, streç veya koli bandıyla sarmayın. Bandı sökerken ambalaj yırtılır ve parça satılamaz
            hâle gelir.
          </li>
          <li>Faturayı, aksesuarları, cıvata ve contaları eksiksiz koyun. Set ürünlerde parçaların tamamı aynı kolide olmalı.</li>
          <li>
            Kargoya vermeden önce paketin fotoğrafını çekin. Taşıma sırasında bir hasar olursa hakkınızı bu fotoğrafla
            koruruz.
          </li>
        </ul>
      </section>

      <section className="policy-step">
        <h3><span>3</span>Ambalaj bozulursa ne oluyor?</h3>
        <p>
          Parça sıfır olsa bile ambalajı yırtılmış, bantlanmış, üzerine yazılmış ya da ezilmişse o ürünü bir daha yeni
          olarak satamayız. Bu durumda iadeniz reddedilmez; ürünün uğradığı değer kaybı iade tutarınızdan düşülür ve kalan
          tutar size ödenir.
        </p>
        <p>
          Kesinti yapmamız gerekirse size fotoğrafla bildiririz; ne kadarının neden düşüldüğünü açıkça görürsünüz. Keyfî
          kesinti yapmıyoruz.
        </p>
        <Legal>
          Mesafeli Sözleşmeler Yönetmeliği md. 13/2 — tüketici, cayma süresi içinde malı işleyişine, teknik özelliklerine
          ve kullanım talimatlarına uygun kullandığı takdirde meydana gelen değişiklik ve bozulmalardan sorumlu değildir.
          Bu kullanımın dışına çıkılarak oluşan değer kaybından ise sorumludur.
        </Legal>
      </section>

      <section className="policy-step">
        <h3><span>4</span>İade alamadığımız durumlar</h3>
        <ul className="policy-list is-no">
          <li>
            <b>Araca takılmış / monte edilmiş parçalar.</b> Takıldığı anda parça kullanılmış sayılır; fren balatası, disk,
            filtre, triger seti, debriyaj, amortisör, elektrikli ve elektronik parçalar (sensör, bobin, beyin, marş,
            alternatör) bir kez monte edildiğinde sıfır ürün olmaktan çıkar.
          </li>
          <li>
            <b>Ambalajı açılmış yağ, antifriz, sprey ve kimyasallar.</b> Açıldıktan sonra içeriğinin karışıp karışmadığı
            anlaşılamaz.
          </li>
          <li>
            <b>Şasi numaranıza göre özel olarak tedarik ettiğimiz parçalar.</b> Sizin için sipariş üzerine getirtilen,
            stoğumuzda bulunmayan ürünler.
          </li>
          <li>
            <b>Elektronik parçalarda kutusu açılıp araca bağlanmış olanlar.</b> Araç beynine tanıtılan ya da akıma verilen
            parça iade edilemez — bu parçalar üreticiye de geri dönmez.
          </li>
          <li>
            <b>Üzerinde çizik, montaj izi, boya izi, sökme izi olan parçalar.</b>
          </li>
        </ul>
        <Legal>
          Mesafeli Sözleşmeler Yönetmeliği md. 15 — kurulumu veya montajı yapılmış mallar, tüketicinin istekleri
          doğrultusunda özel olarak hazırlanan mallar ve tesliminden sonra başka ürünlerle karışarak ayrıştırılması mümkün
          olmayan mallar cayma hakkının kapsamı dışındadır.
        </Legal>
      </section>

      <section className="policy-step is-ok">
        <h3><span>✓</span>Hata bizdeyse hiçbir şey ödemezsiniz</h3>
        <ul className="policy-list is-yes">
          <li>Yanlış parça gönderdiysek</li>
          <li>Parça kırık, eksik ya da ayıplı geldiyse</li>
          <li>Kargoda hasar gördüyse</li>
        </ul>
        <p>
          Bu durumlarda kargo ücreti bize aittir, ürünü hiçbir kesinti yapmadan değiştirir ya da ücretini{" "}
          <b>tam olarak iade ederiz</b>. Ayıplı mal haklarınız (6502 sayılı Kanun md. 11) cayma hakkından ayrıdır ve 2 yıl
          boyunca geçerlidir. Bu durumda kutunun durumuna da bakmayız — <b>fotoğraf çekip bize ulaşmanız yeterli.</b>
        </p>
      </section>

      <section className="policy-step">
        <h3><span>5</span>İade süreci nasıl işliyor?</h3>
        <ol className="policy-flow">
          <li>
            <b>Talebinizi iletirsiniz.</b> Sipariş numaranızla {contact ?? "WhatsApp"}
            {phone ? <> ya da <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></> : null} üzerinden bize
            ulaşın.
          </li>
          <li>
            <b>İnceleyip onaylarız</b> — en geç 1 iş günü. Anlaşmalı kargo kodunuz ve iade bilgileriniz size iletilir.
          </li>
          <li>
            <b>Ürünü kargoya verirsiniz.</b> Sipariş numaranızı yazdığınız bir notu paketin içine koyun.
          </li>
          <li>
            <b>Ürün bize ulaşır,</b> kontrol edilir. Arıza incelemesi gerekirse garanti sürecine alınır (yasal azami tamir
            süresi 20 iş günü).
          </li>
          <li>
            <b>Sonuç bildirilir</b> ve ödemeniz iade edilir.
          </li>
        </ol>
        <p>Her adımda sizi bilgilendiririz; süreçle ilgili sorularınız için bize her zaman ulaşabilirsiniz.</p>
      </section>

      <section className="policy-step">
        <h3><span>6</span>Paranız ne zaman iade edilir?</h3>
        <p>
          İade talebiniz bize ulaştıktan sonra ürün depomuzda kontrol edilir ve <b>en geç 14 gün içinde</b> ödemeniz,
          kullandığınız ödeme yöntemine iade edilir. Kredi kartına yapılan iadelerin hesabınıza yansıma süresi bankanıza
          bağlıdır.
        </p>
      </section>
    </PolicyDialog>
  );
}
