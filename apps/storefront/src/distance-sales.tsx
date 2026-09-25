import { COMPANY_ADDRESS, COMPANY_CONTACT } from "@guntan/db/content/contact";

export const MESAFELI_TITLE = "Mesafeli Satış Sözleşmesi";

export function DistanceSalesContract() {
  const seller = COMPANY_CONTACT;
  return (
    <article className="container page-surface sales-contract">
      <h1>{MESAFELI_TITLE}</h1>
      <p>
        UYARI: İlgili yasa gereği lütfen aşağıdaki sözleşme metnimizi 12 punto ve koyu fontta print ederek
        okuyunuz. Ayrıca; internet sitemize üye olan ve alışveriş yapan her müşteri, tarafımızdan düzenlenmiş olan
        aşağıdaki satış sözleşmemizin tüm maddelerini başka bir ihbara gerek kalmadan okumuş ve kabul etmiş sayılır!
      </p>

      <h2>1. Taraflar</h2>
      <p>
        İşbu Sözleşme aşağıdaki taraflar arasında aşağıda belirtilen hüküm ve şartlar çerçevesinde imzalanmıştır.
      </p>
      <p>A. “ALICI”; (sözleşmede bundan sonra “ALICI” olarak anılacaktır)</p>
      <p>
        B. “SATICI”; (sözleşmede bundan sonra “SATICI” olarak anılacaktır)
        <br />
        ÜNVAN: {seller.tradeName}
        <br />
        ADRES: {COMPANY_ADDRESS}
        <br />
        TELEFON: {seller.phone}
        <br />
        E-POSTA: {seller.email}
        <br />
        VERGİ DAİRESİ: {seller.taxOffice}
        <br />
        T.C.: {seller.taxId}
      </p>
      <p>
        İş bu sözleşmeyi kabul etmekle ALICI, sözleşme konusu siparişi onayladığı takdirde sipariş konusu bedeli ve
        varsa kargo ücreti, vergi gibi belirtilen ek ücretleri ödeme yükümlülüğü altına gireceğini ve bu konuda
        bilgilendirildiğini peşinen kabul eder.
      </p>

      <h2>2. Tanımlar</h2>
      <p>
        İşbu sözleşmenin uygulanmasında ve yorumlanmasında aşağıda yazılı terimler karşılarındaki yazılı açıklamaları
        ifade edeceklerdir.
      </p>
      <p>BAKAN: Gümrük ve Ticaret Bakanı’nı,</p>
      <p>BAKANLIK: Gümrük ve Ticaret Bakanlığı’nı,</p>
      <p>KANUN: 6502 sayılı Tüketicinin Korunması Hakkında Kanun’u,</p>
      <p>YÖNETMELİK: Mesafeli Sözleşmeler Yönetmeliği’ni (RG:27.11.2014/29188)</p>
      <p>
        HİZMET: Bir ücret veya menfaat karşılığında yapılan ya da yapılması taahhüt edilen mal sağlama dışındaki her
        türlü tüketici işleminin konusunu,
      </p>
      <p>
        SATICI: Ticari veya mesleki faaliyetleri kapsamında tüketiciye mal sunan veya mal sunan adına veya hesabına
        hareket eden şirketi,
      </p>
      <p>
        ALICI: Bir mal veya hizmeti ticari veya mesleki olmayan amaçlarla edinen, kullanan veya yararlanan gerçek ya
        da tüzel kişiyi,
      </p>
      <p>SİTE: SATICI’ya ait internet sitesini, {seller.site}</p>
      <p>
        SİPARİŞ VEREN: Bir mal veya hizmeti SATICI’ya ait internet sitesi üzerinden talep eden gerçek ya da tüzel
        kişiyi,
      </p>
      <p>TARAFLAR: SATICI ve ALICI’yı,</p>
      <p>SÖZLEŞME: SATICI ve ALICI arasında akdedilen işbu sözleşmeyi,</p>
      <p>
        MAL: Alışverişe konu olan taşınır eşyayı ve elektronik ortamda kullanılmak üzere hazırlanan yazılım, ses,
        görüntü ve benzeri gayri maddi malları ifade eder.
      </p>

      <h2>3. Konu</h2>
      <p>
        İşbu Sözleşme, ALICI’nın, SATICI’ya ait internet sitesi üzerinden elektronik ortamda siparişini verdiği
        aşağıda nitelikleri ve satış fiyatı belirtilen ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı
        Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmelere Dair Yönetmelik hükümleri gereğince tarafların
        hak ve yükümlülüklerini düzenler. Listelenen ve sitede ilan edilen fiyatlar satış fiyatıdır. İlan edilen
        fiyatlar ve vaatler güncelleme yapılana ve değiştirilene kadar geçerlidir. Süreli olarak ilan edilen fiyatlar
        ise belirtilen süre sonuna kadar geçerlidir.
      </p>

      <h2>4. Sözleşme konusu ürün/ürünler bilgileri</h2>
      <p>
        4.1. Malın / ürünün / ürünlerin / hizmetin temel özelliklerini (türü, miktarı, marka/modeli, rengi, adedi)
        SATICI’ya ait internet sitesinde yayınlanmaktadır. Satıcı tarafından kampanya düzenlenmiş ise ilgili ürünün
        temel özelliklerini kampanya süresince inceleyebilirsiniz. Kampanya tarihine kadar geçerlidir.
      </p>
      <p>
        4.2. Listelenen ve sitede ilan edilen fiyatlar satış fiyatıdır. İlan edilen fiyatlar ve vaatler güncelleme
        yapılana ve değiştirilene kadar geçerlidir. Süreli olarak ilan edilen fiyatlar ise belirtilen süre sonuna
        kadar geçerlidir.
      </p>
      <p>4.3. Ürün sevkiyat masrafı olan kargo ücreti ALICI tarafından ödenecektir.</p>

      <h2>5. Genel hükümler</h2>
      <p>
        5.1. ALICI, SATICI’ya ait internet sitesinde sözleşme konusu ürünün temel nitelikleri, satış fiyatı ve ödeme
        şekli ile teslimata ilişkin ön bilgileri okuyup, bilgi sahibi olduğunu, elektronik ortamda gerekli teyidi
        verdiğini kabul, beyan ve taahhüt eder. ALICI’nın; Ön Bilgilendirmeyi elektronik ortamda teyit etmesi,
        mesafeli satış sözleşmesinin kurulmasından evvel, SATICI tarafından ALICI’ya verilmesi gereken adresi,
        siparişi verilen ürünlere ait temel özellikleri, ürünlerin vergiler dâhil fiyatını, ödeme ve teslimat
        bilgilerini de doğru ve eksiksiz olarak edindiğini kabul, beyan ve taahhüt eder.
      </p>
      <p>
        5.2. Sözleşme konusu her bir ürün, 30 günlük yasal süreyi aşmamak kaydı ile ALICI’nın yerleşim yeri uzaklığına
        bağlı olarak internet sitesindeki ön bilgiler kısmında belirtilen süre zarfında ALICI veya ALICI’nın gösterdiği
        adresteki kişi ve/veya kuruluşa teslim edilir. Bu süre içinde ürünün ALICI’ya teslim edilememesi durumunda,
        ALICI’nın sözleşmeyi feshetme hakkı saklıdır.
      </p>
      <p>
        5.3. SATICI, Sözleşme konusu ürünü eksiksiz, siparişte belirtilen niteliklere uygun ve varsa garanti belgeleri,
        kullanım kılavuzları işin gereği olan bilgi ve belgeler ile teslim etmeyi, her türlü ayıptan arî olarak yasal
        mevzuat gereklerine göre sağlam, standartlara uygun bir şekilde işi doğruluk ve dürüstlük esasları dâhilinde
        ifa etmeyi, hizmet kalitesini koruyup yükseltmeyi, işin ifası sırasında gerekli dikkat ve özeni göstermeyi,
        ihtiyat ve öngörü ile hareket etmeyi kabul, beyan ve taahhüt eder.
      </p>
      <p>
        5.4. SATICI, sözleşmeden doğan ifa yükümlülüğünün süresi dolmadan ALICI’yı bilgilendirmek ve açıkça onayını
        almak suretiyle eşit kalite ve fiyatta farklı bir ürün tedarik edebilir.
      </p>
      <p>
        5.5. SATICI, sipariş konusu ürün veya hizmetin yerine getirilmesinin imkânsızlaşması halinde sözleşme konusu
        yükümlülüklerini yerine getiremezse, bu durumu, öğrendiği tarihten itibaren 3 gün içinde yazılı olarak
        tüketiciye bildireceğini, 14 günlük süre içinde toplam bedeli ALICI’ya iade edeceğini kabul, beyan ve taahhüt
        eder.
      </p>
      <p>
        5.6. ALICI, Sözleşme konusu ürünün teslimatı için işbu Sözleşme’yi elektronik ortamda teyit edeceğini, herhangi
        bir nedenle sözleşme konusu ürün bedelinin ödenmemesi ve/veya banka kayıtlarında iptal edilmesi halinde,
        SATICI’nın sözleşme konusu ürünü teslim yükümlülüğünün sona ereceğini kabul, beyan ve taahhüt eder.
      </p>
      <p>
        5.7. ALICI, Sözleşme konusu ürünün ALICI veya ALICI’nın gösterdiği adresteki kişi ve/veya kuruluşa tesliminden
        sonra ALICI’ya ait kredi kartının yetkisiz kişilerce haksız kullanılması sonucunda sözleşme konusu ürün
        bedelinin ilgili banka veya finans kuruluşu tarafından SATICI’ya ödenmemesi halinde, ALICI Sözleşme konusu
        ürünü 3 gün içerisinde nakliye gideri SATICI’ya ait olacak şekilde SATICI’ya iade edeceğini kabul, beyan ve
        taahhüt eder.
      </p>
      <p>
        5.8. SATICI, tarafların iradesi dışında gelişen, önceden öngörülemeyen ve tarafların borçlarını yerine
        getirmesini engelleyici ve/veya geciktirici hallerin oluşması gibi mücbir sebepler halleri nedeni ile sözleşme
        konusu ürünü süresi içinde teslim edemez ise, durumu ALICI’ya bildireceğini kabul, beyan ve taahhüt eder.
        ALICI da siparişin iptal edilmesini, sözleşme konusu ürünün varsa emsali ile değiştirilmesini ve/veya teslimat
        süresinin engelleyici durumun ortadan kalkmasına kadar ertelenmesini SATICI’dan talep etme hakkını haizdir.
        ALICI tarafından siparişin iptal edilmesi halinde ALICI’nın nakit ile yaptığı ödemelerde, ürün tutarı 14 gün
        içinde kendisine nakden ve defaten ödenir. ALICI’nın kredi kartı ile yaptığı ödemelerde ise, ürün tutarı,
        siparişin ALICI tarafından iptal edilmesinden sonra 14 gün içerisinde ilgili bankaya iade edilir. ALICI,
        SATICI tarafından kredi kartına iade edilen tutarın banka tarafından ALICI hesabına yansıtılmasına ilişkin
        ortalama sürecin 2 ile 3 haftayı bulabileceğini, bu tutarın bankaya iadesinden sonra ALICI’nın hesaplarına
        yansıması halinin tamamen banka işlem süreci ile ilgili olduğundan, ALICI, olası gecikmeler için SATICI’yı
        sorumlu tutamayacağını kabul, beyan ve taahhüt eder.
      </p>
      <p>
        5.9. SATICI’nın, ALICI tarafından siteye kayıt formunda belirtilen veya daha sonra kendisi tarafından
        güncellenen adresi, e-posta adresi, sabit ve mobil telefon hatları ve diğer iletişim bilgileri üzerinden
        mektup, e-posta, SMS, telefon görüşmesi ve diğer yollarla iletişim, pazarlama, bildirim ve diğer amaçlarla
        ALICI’ya ulaşma hakkı bulunmaktadır. ALICI, işbu sözleşmeyi kabul etmekle SATICI’nın kendisine yönelik
        yukarıda belirtilen iletişim faaliyetlerinde bulunabileceğini kabul ve beyan etmektedir.
      </p>
      <p>
        5.10. ALICI, sözleşme konusu mal/hizmeti teslim almadan önce muayene edecek; ezik, kırık, ambalajı yırtılmış
        vb. hasarlı ve ayıplı mal/hizmeti kargo şirketinden teslim almayacaktır. Teslim alınan mal/hizmetin hasarsız ve
        sağlam olduğu kabul edilecektir. Teslimden sonra mal/hizmetin özenle korunması borcu, ALICI’ya aittir. Cayma
        hakkı kullanılacaksa mal/hizmet kullanılmamalıdır. Fatura iade edilmelidir.
      </p>
      <p>
        5.11. ALICI, sözleşme konusu mal/hizmeti internet sitesi üzerinden sipariş etmeden önce siparişi vereceği
        adresi kargo şirketinin teslimat yapabilme imkânını teyit etmekle yükümlüdür. Kargo teslimat bölgesi dışında
        kalan adresler için oluşabilecek bedel SATICI tarafından karşılanmaz, ALICI’ya aittir.
      </p>
      <p>
        5.12. ALICI ile sipariş esnasında kullanılan kredi kartı hamilinin aynı kişi olmaması veya ürünün ALICI’ya
        tesliminden evvel, siparişte kullanılan kredi kartına ilişkin güvenlik açığı tespit edilmesi halinde, SATICI,
        kredi kartı hamiline ilişkin kimlik ve iletişim bilgilerini, siparişte kullanılan kredi kartının bir önceki aya
        ait ekstresini yahut kart hamilinin bankasından kredi kartının kendisine ait olduğuna ilişkin yazıyı ibraz
        etmesini ALICI’dan talep edebilir. ALICI’nın talebe konu bilgi/belgeleri temin etmesine kadar geçecek sürede
        sipariş dondurulacak olup, mezkur taleplerin 24 saat içerisinde karşılanmaması halinde ise SATICI, siparişi
        iptal etme hakkını haizdir.
      </p>
      <p>
        5.13. ALICI, SATICI’ya ait internet sitesine üye olurken verdiği kişisel ve diğer sair bilgilerin gerçeğe uygun
        olduğunu, SATICI’nın bu bilgilerin gerçeğe aykırılığı nedeniyle uğrayacağı tüm zararları, SATICI’nın ilk
        bildirimi üzerine derhal, nakden ve defaten tazmin edeceğini beyan ve taahhüt eder.
      </p>
      <p>
        5.14. ALICI, SATICI’ya ait internet sitesini kullanırken yasal mevzuat hükümlerine riayet etmeyi ve bunları
        ihlal etmemeyi baştan kabul ve taahhüt eder. Aksi takdirde, doğacak tüm hukuki ve cezai yükümlülükler tamamen
        ve münhasıran ALICI’yı bağlayacaktır.
      </p>
      <p>
        5.15. ALICI, SATICI’ya ait internet sitesini hiçbir şekilde kamu düzenini bozucu, genel ahlaka aykırı,
        başkalarını rahatsız ve taciz edici şekilde, yasalara aykırı bir amaç için, başkalarının maddi ve manevi
        haklarına tecavüz edecek şekilde kullanamaz. Ayrıca, üye başkalarının hizmetleri kullanmasını önleyici veya
        zorlaştırıcı faaliyet (spam, virüs, truva atı vb.) işlemlerde bulunamaz.
      </p>
      <p>
        5.16. SATICI’ya ait internet sitesinin üzerinden, SATICI’nın kendi kontrolünde olmayan ve/veya başkaca üçüncü
        kişilerin sahip olduğu ve/veya işlettiği başka web sitelerine ve/veya başka içeriklere link verilebilir. Bu
        linkler ALICI’ya yönlenme kolaylığı sağlamak amacıyla konmuş olup herhangi bir web sitesini veya o siteyi
        işleten kişiyi desteklememekte ve link verilen web sitesinin içerdiği bilgilere yönelik herhangi bir garanti
        niteliği taşımamaktadır.
      </p>
      <p>
        5.17. İşbu sözleşme içerisinde sayılan maddelerden bir ya da birkaçını ihlal eden üye işbu ihlal nedeniyle
        cezai ve hukuki olarak şahsen sorumlu olup, SATICI’yı bu ihlallerin hukuki ve cezai sonuçlarından ari
        tutacaktır. Ayrıca; işbu ihlal nedeniyle, olayın hukuk alanına intikal ettirilmesi halinde, SATICI’nın üyeye
        karşı üyelik sözleşmesine uyulmamasından dolayı tazminat talebinde bulunma hakkı saklıdır.
      </p>

      <h2>6. Cayma hakkı</h2>
      <p>
        6.1. ALICI; mesafeli sözleşmenin mal satışına ilişkin olması durumunda, ürünün kendisine veya gösterdiği
        adresteki kişi/kuruluşa teslim tarihinden itibaren 14 (on dört) gün içerisinde, SATICI’ya bildirmek şartıyla
        hiçbir hukuki ve cezai sorumluluk üstlenmeksizin ve hiçbir gerekçe göstermeksizin malı reddederek sözleşmeden
        cayma hakkını kullanabilir. Hizmet sunumuna ilişkin mesafeli sözleşmelerde ise, bu süre sözleşmenin
        imzalandığı tarihten itibaren başlar. Cayma hakkı süresi sona ermeden önce, tüketicinin onayı ile hizmetin
        ifasına başlanan hizmet sözleşmelerinde cayma hakkı kullanılamaz. Cayma hakkının kullanımından kaynaklanan
        masraflar ALICI’ya aittir. ALICI, iş bu sözleşmeyi kabul etmekle, cayma hakkı konusunda bilgilendirildiğini
        peşinen kabul eder.
      </p>
      <p>
        6.2. Cayma hakkının kullanılması için 14 (ondört) günlük süre içinde SATICI’ya iadeli taahhütlü posta, faks
        veya e-posta ile yazılı bildirimde bulunulması ve ürünün işbu sözleşmede düzenlenen “Cayma Hakkı
        Kullanılamayacak Ürünler” hükümleri çerçevesinde kullanılmamış olması şarttır. Bu hakkın kullanılması halinde,
        3. kişiye veya ALICI’ya teslim edilen ürünün faturası, (İade edilmek istenen ürünün faturası kurumsal ise,
        iade ederken kurumun düzenlemiş olduğu iade faturası ile birlikte gönderilmesi gerekmektedir. Faturası
        kurumlar adına düzenlenen sipariş iadeleri İADE FATURASI kesilmediği takdirde tamamlanamayacaktır.) İade
        edilecek ürünlerin kutusu, ambalajı, varsa standart aksesuarları ile birlikte eksiksiz ve hasarsız olarak
        teslim edilmesi gerekmektedir.
      </p>

      <h2>7. Cayma hakkı kullanılamayacak ürünler</h2>
      <p>
        Kullanılmış, ambalajı, kutusu deforme edilmiş, kısa süreli de olsa tecrübe edilmiş, araca montajı yapılmış
        ürünler hiçbir şart altında iade alınmaz.
      </p>

      <h2>8. Temerrüt hali ve hukuki sonuçları</h2>
      <p>
        ALICI, ödeme işlemlerini kredi kartı ile yaptığı durumda temerrüde düştüğü takdirde, kart sahibi banka ile
        arasındaki kredi kartı sözleşmesi çerçevesinde faiz ödeyeceğini ve bankaya karşı sorumlu olacağını kabul,
        beyan ve taahhüt eder. Bu durumda ilgili banka hukuki yollara başvurabilir; doğacak masrafları ve vekâlet
        ücretini ALICI’dan talep edebilir ve her koşulda ALICI’nın borcundan dolayı temerrüde düşmesi halinde, ALICI,
        borcun gecikmeli ifasından dolayı SATICI’nın uğradığı zarar ve ziyanını ödeyeceğini kabul, beyan ve taahhüt
        eder.
      </p>

      <h2>9. Yetkili mahkeme</h2>
      <p>
        İşbu sözleşmeden doğan uyuşmazlıklarda şikayet ve itirazlar, aşağıdaki kanunda belirtilen parasal sınırlar
        dâhilinde tüketicinin yerleşim yerinin bulunduğu veya tüketici işleminin yapıldığı yerdeki tüketici sorunları
        hakem heyetine veya tüketici mahkemesine yapılacaktır. Parasal sınıra ilişkin bilgiler aşağıdadır:
      </p>
      <p>28/05/2014 tarihinden itibaren geçerli olmak üzere:</p>
      <p>
        a) 6502 sayılı Tüketicinin Korunması Hakkında Kanun’un 68. maddesi gereği değeri 2.000,00 (ikibin) TL’nin
        altında olan uyuşmazlıklarda ilçe tüketici hakem heyetlerine,
      </p>
      <p>b) Değeri 3.000,00 (üçbin) TL’nin altında bulunan uyuşmazlıklarda il tüketici hakem heyetlerine,</p>
      <p>
        c) Büyükşehir statüsünde bulunan illerde ise değeri 2.000,00 (ikibin) TL ile 3.000,00 (üçbin) TL arasındaki
        uyuşmazlıklarda il tüketici hakem heyetlerine başvuru yapılmaktadır.
      </p>
      <p>İşbu Sözleşme ticari amaçlarla yapılmaktadır.</p>

      <h2>10. Yürürlük</h2>
      <p>
        ALICI, Site üzerinden verdiği siparişe ait ödemeyi gerçekleştirdiğinde işbu sözleşmenin tüm şartlarını kabul
        etmiş sayılır. SATICI, siparişin gerçekleşmesi öncesinde işbu sözleşmenin sitede ALICI tarafından okunup kabul
        edildiğine dair onay alacak şekilde gerekli yazılımsal düzenlemeleri yapmakla yükümlüdür.
      </p>
    </article>
  );
}
