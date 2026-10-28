/**
 * Güntan SEO haritası (Guntan-SEO-Kategori-Blog-Haritasi.xlsx, 25.10.2026): kategori başlıkları, hedef sorgular
 * ve blog konu planı. Mevcut URL'ler değişmez; yalnız başlık/H1/açıklama ve iç bağlantılar bu veriden gelir.
 */

export type SeoCategoryPriority = "P1" | "P2" | "P3";

export type SeoCategoryEntry = {
  /** Haritadaki kayıt kimliği (K01, K01-01…). */
  id: string;
  /** Üst grubun kimliği; ana grupta boş. */
  parentId: string | null;
  /** Kullanıcıların aradığı açık sayfa adı / H1. */
  name: string;
  /** Ana hedef sorgu. */
  query: string;
  /** SEO başlığı (site adı şablonla eklenir). */
  title: string;
  priority: SeoCategoryPriority;
};

/** Anahtar: mevcut /kategori/<slug> adresi. */
export const SEO_CATEGORIES: Record<string, SeoCategoryEntry> = {
  "fren-aksami": { id: "K01", parentId: null, name: "Fren Sistemi", query: "fren parçaları", title: "Fren Sistemi Fiyatları", priority: "P1" },
  "fren-balatasi": { id: "K01-01", parentId: "K01", name: "Fren Balataları", query: "fren balatası", title: "Fren Balataları Fiyatları", priority: "P1" },
  "fren-diski": { id: "K01-02", parentId: "K01", name: "Fren Diskleri", query: "fren diski", title: "Fren Diskleri Fiyatları", priority: "P1" },
  "kaliper": { id: "K01-03", parentId: "K01", name: "Fren Kaliperleri", query: "fren kaliperi", title: "Fren Kaliperleri Fiyatları", priority: "P2" },
  "fren-hortumu": { id: "K01-04", parentId: "K01", name: "Fren Hortumları", query: "fren hortumu", title: "Fren Hortumları Fiyatları", priority: "P2" },
  "fren-deb-merkez": { id: "K01-05", parentId: "K01", name: "Fren ve Debriyaj Merkezleri", query: "fren merkezi", title: "Fren ve Debriyaj Merkezleri Fiyatları", priority: "P2" },
  "abs-sensor": { id: "K01-06", parentId: "K01", name: "ABS Sensörleri", query: "ABS sensörü", title: "ABS Sensörleri Fiyatları", priority: "P2" },
  "filtre": { id: "K02", parentId: null, name: "Filtreler ve Periyodik Bakım", query: "oto filtre", title: "Filtreler ve Periyodik Bakım Fiyatları", priority: "P1" },
  "yag-filtresi": { id: "K02-01", parentId: "K02", name: "Yağ Filtreleri", query: "yağ filtresi", title: "Yağ Filtreleri Fiyatları", priority: "P1" },
  "hava-filtresi": { id: "K02-02", parentId: "K02", name: "Hava Filtreleri", query: "hava filtresi", title: "Hava Filtreleri Fiyatları", priority: "P1" },
  "polen-filtresi": { id: "K02-03", parentId: "K02", name: "Polen Filtreleri", query: "polen filtresi", title: "Polen Filtreleri Fiyatları", priority: "P1" },
  "yakit-filtresi": { id: "K02-04", parentId: "K02", name: "Yakıt Filtreleri", query: "yakıt filtresi", title: "Yakıt Filtreleri Fiyatları", priority: "P1" },
  "motor": { id: "K03", parentId: null, name: "Motor Parçaları", query: "motor yedek parça", title: "Motor Parçaları Fiyatları", priority: "P2" },
  "conta-sibop-lastik": { id: "K03-01", parentId: "K03", name: "Motor Contaları ve Supap Lastikleri", query: "motor contası", title: "Motor Contaları ve Supap Lastikleri Fiyatları", priority: "P2" },
  "piston": { id: "K03-02", parentId: "K03", name: "Pistonlar", query: "motor pistonu", title: "Pistonlar Fiyatları", priority: "P2" },
  "segman": { id: "K03-03", parentId: "K03", name: "Segmanlar", query: "piston segmanı", title: "Segmanlar Fiyatları", priority: "P2" },
  "silindir-kapagi": { id: "K03-04", parentId: "K03", name: "Silindir Kapakları", query: "silindir kapağı", title: "Silindir Kapakları Fiyatları", priority: "P2" },
  "supap": { id: "K03-05", parentId: "K03", name: "Supaplar", query: "motor supabı", title: "Supaplar Fiyatları", priority: "P2" },
  "yag-pompasi": { id: "K03-06", parentId: "K03", name: "Yağ Pompaları", query: "yağ pompası", title: "Yağ Pompaları Fiyatları", priority: "P2" },
  "turbo": { id: "K03-07", parentId: "K03", name: "Turbo", query: "turbo yedek parça", title: "Turbo Fiyatları", priority: "P2" },
  "eksantrik-mili": { id: "K03-08", parentId: "K03", name: "Eksantrik Milleri", query: "eksantrik mili", title: "Eksantrik Milleri Fiyatları", priority: "P3" },
  "krank": { id: "K03-09", parentId: "K03", name: "Krank Milleri", query: "krank mili", title: "Krank Milleri Fiyatları", priority: "P3" },
  "motor-takozu": { id: "K03-10", parentId: "K03", name: "Motor Takozları", query: "motor takozu", title: "Motor Takozları Fiyatları", priority: "P2" },
  "kayis": { id: "K04", parentId: null, name: "Triger ve Kayışlar", query: "triger ve kayış", title: "Triger ve Kayışlar Fiyatları", priority: "P1" },
  "triger-seti-eksantrik": { id: "K04-01", parentId: "K04", name: "Triger Setleri", query: "triger seti", title: "Triger Setleri Fiyatları", priority: "P1" },
  "triger-kayisi": { id: "K04-02", parentId: "K04", name: "Triger Kayışları", query: "triger kayışı", title: "Triger Kayışları Fiyatları", priority: "P1" },
  "zincir-seti": { id: "K04-03", parentId: "K04", name: "Triger Zincir Setleri", query: "triger zincir seti", title: "Triger Zincir Setleri Fiyatları", priority: "P1" },
  "kanalli-kayis": { id: "K04-04", parentId: "K04", name: "V Kayışları", query: "V kayışı", title: "V Kayışları Fiyatları", priority: "P2" },
  "rl-gergi": { id: "K04-05", parentId: "K04", name: "Gergi Rulmanları", query: "gergi rulmanı", title: "Gergi Rulmanları Fiyatları", priority: "P2" },
  "rl-gergi-kasnak": { id: "K04-06", parentId: "K04", name: "Gergi Kasnakları", query: "gergi kasnağı", title: "Gergi Kasnakları Fiyatları", priority: "P2" },
  "sanzuman": { id: "K05", parentId: null, name: "Debriyaj ve Şanzıman", query: "debriyaj ve şanzıman parçaları", title: "Debriyaj ve Şanzıman Fiyatları", priority: "P1" },
  "debriyaj-seti": { id: "K05-01", parentId: "K05", name: "Debriyaj Setleri", query: "debriyaj seti", title: "Debriyaj Setleri Fiyatları", priority: "P1" },
  "rl-debriyaj": { id: "K05-02", parentId: "K05", name: "Debriyaj Rulmanları", query: "debriyaj rulmanı", title: "Debriyaj Rulmanları Fiyatları", priority: "P2" },
  "volan": { id: "K05-03", parentId: "K05", name: "Volanlar", query: "volan", title: "Volanlar Fiyatları", priority: "P2" },
  "debriyaj-catali": { id: "K05-04", parentId: "K05", name: "Debriyaj Çatalları", query: "debriyaj çatalı", title: "Debriyaj Çatalları Fiyatları", priority: "P3" },
  "sanzuman-muhtelif": { id: "K05-05", parentId: "K05", name: "Şanzıman Parçaları", query: "şanzıman yedek parça", title: "Şanzıman Parçaları Fiyatları", priority: "P3" },
  "debriyaj-teli": { id: "K05-06", parentId: "K05", name: "Debriyaj Telleri", query: "debriyaj teli", title: "Debriyaj Telleri Fiyatları", priority: "P3" },
  "alt-takim": { id: "K06", parentId: null, name: "Süspansiyon ve Alt Takım", query: "alt takım parçaları", title: "Süspansiyon ve Alt Takım Fiyatları", priority: "P1" },
  "amortisor": { id: "K06-01", parentId: "K06", name: "Amortisörler", query: "amortisör", title: "Amortisörler Fiyatları", priority: "P1" },
  "salincak": { id: "K06-02", parentId: "K06", name: "Salıncaklar", query: "salıncak", title: "Salıncaklar Fiyatları", priority: "P1" },
  "helezon-yayi": { id: "K06-03", parentId: "K06", name: "Helezon Yayları", query: "helezon yayı", title: "Helezon Yayları Fiyatları", priority: "P2" },
  "aks-grubu": { id: "K06-04", parentId: "K06", name: "Akslar ve Aks Parçaları", query: "aks", title: "Akslar ve Aks Parçaları Fiyatları", priority: "P2" },
  "teker-poryasi": { id: "K06-05", parentId: "K06", name: "Teker Poryaları", query: "teker poryası", title: "Teker Poryaları Fiyatları", priority: "P2" },
  "rl-teker-kit": { id: "K06-06", parentId: "K06", name: "Teker Rulman Kitleri", query: "teker rulmanı", title: "Teker Rulman Kitleri Fiyatları", priority: "P2" },
  "amortisor-kule-rulman": { id: "K06-07", parentId: "K06", name: "Amortisör Takozu ve Rulmanı", query: "amortisör takozu", title: "Amortisör Takozu ve Rulmanı Fiyatları", priority: "P2" },
  "rotil": { id: "K06-08", parentId: "K06", name: "Rotiller", query: "rotil", title: "Rotiller Fiyatları", priority: "P2" },
  "direksiyon": { id: "K07", parentId: null, name: "Direksiyon Sistemi", query: "direksiyon parçaları", title: "Direksiyon Sistemi Fiyatları", priority: "P2" },
  "direksiyon-kutusu": { id: "K07-01", parentId: "K07", name: "Direksiyon Kutuları", query: "direksiyon kutusu", title: "Direksiyon Kutuları Fiyatları", priority: "P2" },
  "direksiyon-pompa": { id: "K07-02", parentId: "K07", name: "Direksiyon Pompaları", query: "direksiyon pompası", title: "Direksiyon Pompaları Fiyatları", priority: "P2" },
  "rot-basi": { id: "K07-03", parentId: "K07", name: "Rot Başları", query: "rot başı", title: "Rot Başları Fiyatları", priority: "P2" },
  "rot-kolu": { id: "K07-04", parentId: "K07", name: "Rot Kolları", query: "rot kolu", title: "Rot Kolları Fiyatları", priority: "P2" },
  "sogutma": { id: "K08", parentId: null, name: "Motor Soğutma", query: "motor soğutma parçaları", title: "Motor Soğutma Fiyatları", priority: "P1" },
  "isitma-su-rad": { id: "K08-01", parentId: "K08", name: "Su Radyatörleri", query: "su radyatörü", title: "Su Radyatörleri Fiyatları", priority: "P1" },
  "isitma-devirdaim": { id: "K08-02", parentId: "K08", name: "Devirdaim Pompaları", query: "devirdaim pompası", title: "Devirdaim Pompaları Fiyatları", priority: "P1" },
  "isitma-termostat": { id: "K08-03", parentId: "K08", name: "Termostatlar", query: "termostat", title: "Termostatlar Fiyatları", priority: "P1" },
  "depo-radyator-kapak": { id: "K08-04", parentId: "K08", name: "Radyatör ve Depo Kapakları", query: "radyatör kapağı", title: "Radyatör ve Depo Kapakları Fiyatları", priority: "P2" },
  "isitma-fan-termigi": { id: "K08-05", parentId: "K08", name: "Radyatör Fanı ve Fan Termiği", query: "radyatör fan termiği", title: "Radyatör Fanı ve Fan Termiği Fiyatları", priority: "P2" },
  "motor-su-hortumu": { id: "K08-06", parentId: "K08", name: "Motor Su Hortumları", query: "motor su hortumu", title: "Motor Su Hortumları Fiyatları", priority: "P2" },
  "klima-ve-isitma": { id: "K09", parentId: null, name: "Klima ve Isıtma", query: "oto klima parçaları", title: "Klima ve Isıtma Fiyatları", priority: "P2" },
  "isitma-klima-kompresor": { id: "K09-01", parentId: "K09", name: "Klima Kompresörleri", query: "klima kompresörü", title: "Klima Kompresörleri Fiyatları", priority: "P2" },
  "isitma-klima-rad": { id: "K09-02", parentId: "K09", name: "Klima Radyatörleri", query: "klima radyatörü", title: "Klima Radyatörleri Fiyatları", priority: "P2" },
  "isitma-kalorifer-rad": { id: "K09-03", parentId: "K09", name: "Kalorifer Radyatörleri", query: "kalorifer radyatörü", title: "Kalorifer Radyatörleri Fiyatları", priority: "P2" },
  "isitma-fan-rad-klima": { id: "K09-04", parentId: "K09", name: "Fan ve Klima Parçaları", query: "oto fan parçaları", title: "Fan ve Klima Parçaları Fiyatları", priority: "P3" },
  "elektrik": { id: "K10", parentId: null, name: "Elektrik ve Sensörler", query: "oto elektrik parçaları", title: "Elektrik ve Sensörler Fiyatları", priority: "P2" },
  "sarj-mars-dinamosu": { id: "K10-01", parentId: "K10", name: "Marş ve Şarj Dinamoları", query: "marş motoru ve alternatör", title: "Marş ve Şarj Dinamoları Fiyatları", priority: "P2" },
  "sensor": { id: "K10-02", parentId: "K10", name: "Motor Sensörleri", query: "motor sensörü", title: "Motor Sensörleri Fiyatları", priority: "P2" },
  "hava-akis-sensor": { id: "K10-03", parentId: "K10", name: "Hava Akış Sensörleri", query: "hava akış sensörü", title: "Hava Akış Sensörleri Fiyatları", priority: "P2" },
  "musur-role": { id: "K10-04", parentId: "K10", name: "Müşür ve Röleler", query: "oto müşür ve röle", title: "Müşür ve Röleler Fiyatları", priority: "P3" },
  "depo-samandira": { id: "K10-05", parentId: "K10", name: "Depo Şamandıraları", query: "depo şamandırası", title: "Depo Şamandıraları Fiyatları", priority: "P3" },
  "yakit-otomatigi": { id: "K10-06", parentId: "K10", name: "Yakıt Pompaları", query: "yakıt pompası", title: "Yakıt Pompaları Fiyatları", priority: "P2" },
  "atesleme": { id: "K11", parentId: null, name: "Ateşleme Sistemi", query: "ateşleme sistemi parçaları", title: "Ateşleme Sistemi Fiyatları", priority: "P1" },
  "atesleme-bujisi": { id: "K11-01", parentId: "K11", name: "Ateşleme Bujileri", query: "ateşleme bujisi", title: "Ateşleme Bujileri Fiyatları", priority: "P1" },
  "bobin-modul": { id: "K11-02", parentId: "K11", name: "Ateşleme Bobinleri ve Modüller", query: "ateşleme bobini", title: "Ateşleme Bobinleri ve Modüller Fiyatları", priority: "P1" },
  "buji-kablosu": { id: "K11-03", parentId: "K11", name: "Buji Kabloları", query: "buji kablosu", title: "Buji Kabloları Fiyatları", priority: "P2" },
  "kizdirma-bujisi": { id: "K11-04", parentId: "K11", name: "Kızdırma Bujileri", query: "kızdırma bujisi", title: "Kızdırma Bujileri Fiyatları", priority: "P1" },
  "aydinlatma": { id: "K12", parentId: null, name: "Aydınlatma", query: "oto aydınlatma parçaları", title: "Aydınlatma Fiyatları", priority: "P2" },
  "far": { id: "K12-01", parentId: "K12", name: "Farlar", query: "otomobil farı", title: "Farlar Fiyatları", priority: "P2" },
  "stop-lambasi": { id: "K12-02", parentId: "K12", name: "Stop Lambaları", query: "stop lambası", title: "Stop Lambaları Fiyatları", priority: "P2" },
  "sis-fari": { id: "K12-03", parentId: "K12", name: "Sis Farları", query: "sis farı", title: "Sis Farları Fiyatları", priority: "P3" },
  "ampul": { id: "K12-04", parentId: "K12", name: "Ampuller", query: "oto ampul", title: "Ampuller Fiyatları", priority: "P3" },
  "kaporta": { id: "K13", parentId: null, name: "Kaporta ve Dış Donanım", query: "kaporta yedek parça", title: "Kaporta ve Dış Donanım Fiyatları", priority: "P2" },
  "tampon": { id: "K13-01", parentId: "K13", name: "Tamponlar", query: "tampon", title: "Tamponlar Fiyatları", priority: "P1" },
  "camurluk": { id: "K13-02", parentId: "K13", name: "Çamurluklar", query: "çamurluk", title: "Çamurluklar Fiyatları", priority: "P2" },
  "kaput": { id: "K13-03", parentId: "K13", name: "Kaputlar", query: "kaput", title: "Kaputlar Fiyatları", priority: "P2" },
  "panjur": { id: "K13-04", parentId: "K13", name: "Panjurlar", query: "ön panjur", title: "Panjurlar Fiyatları", priority: "P2" },
  "ayna": { id: "K13-05", parentId: "K13", name: "Dış Aynalar", query: "dikiz aynası", title: "Dış Aynalar Fiyatları", priority: "P1" },
  "kapi-kolu": { id: "K13-06", parentId: "K13", name: "Kapı Kolları", query: "kapı kolu", title: "Kapı Kolları Fiyatları", priority: "P2" },
  "cam-krikosu": { id: "K13-07", parentId: "K13", name: "Cam Krikoları", query: "cam krikosu", title: "Cam Krikoları Fiyatları", priority: "P2" },
  "bagaj-amortisoru": { id: "K13-08", parentId: "K13", name: "Bagaj Amortisörleri", query: "bagaj amortisörü", title: "Bagaj Amortisörleri Fiyatları", priority: "P2" },
  "camurluk-davlumbazi": { id: "K13-09", parentId: "K13", name: "Çamurluk Davlumbazları", query: "çamurluk davlumbazı", title: "Çamurluk Davlumbazları Fiyatları", priority: "P3" },
  "kimyasal": { id: "K14", parentId: null, name: "Yağlar ve Bakım Sıvıları", query: "oto yağ ve bakım sıvıları", title: "Yağlar ve Bakım Sıvıları Fiyatları", priority: "P2" },
  "motor-ve-sanz-yag": { id: "K14-01", parentId: "K14", name: "Motor ve Şanzıman Yağları", query: "motor ve şanzıman yağı", title: "Motor ve Şanzıman Yağları Fiyatları", priority: "P2" },
  "antifriz": { id: "K14-02", parentId: "K14", name: "Antifriz", query: "antifriz", title: "Antifriz Fiyatları", priority: "P1" },
  "dot-fren-hidrolik": { id: "K14-03", parentId: "K14", name: "Fren Hidrolikleri", query: "fren hidroliği", title: "Fren Hidrolikleri Fiyatları", priority: "P2" },
  "balata-sprey": { id: "K14-04", parentId: "K14", name: "Balata Temizleyici Spreyler", query: "balata spreyi", title: "Balata Temizleyici Spreyler Fiyatları", priority: "P3" },
  "aksesuar": { id: "K15", parentId: null, name: "Silecek ve Aksesuar", query: "oto aksesuar", title: "Silecek ve Aksesuar Fiyatları", priority: "P2" },
  "silecek": { id: "K15-01", parentId: "K15", name: "Silecekler", query: "silecek", title: "Silecekler Fiyatları", priority: "P1" },
};

export type SeoBlogTopic = {
  id: string;
  cluster: string;
  title: string;
  query: string;
  slug: string;
  /** Ana satış sayfası (site köküne göre); "/" ana sayfadır. */
  target: string;
  /** Satış sayfasına verilecek bağlantı metni. */
  anchor: string;
  /** İlgili yazı kimlikleri. */
  related: string[];
  priority: SeoCategoryPriority;
  /** Önerilen yayın haftası (haftada iki yazı). */
  week: number;
  /** İçerik kapsamı / H2 konuları. */
  outline: string[];
};

export const SEO_BLOG_TOPICS: SeoBlogTopic[] = [
  { id: "B01", cluster: "Parça seçimi", title: "Şasi numarası ile uyumlu yedek parça nasıl bulunur?", query: "şasi numarası ile yedek parça bulma", slug: "sasi-numarasi-ile-uyumlu-yedek-parca-nasil-bulunur", target: "/", anchor: "aracınıza uygun yedek parçalar", related: ["B03"], priority: "P1", week: 1, outline: ["Şasi ve motor kodu", "OEM eşleştirme", "siparişten önce uyum kontrolü"] },
  { id: "B02", cluster: "Yağlar ve Bakım Sıvıları", title: "Antifriz seçerken renk mi üretici standardı mı önemlidir?", query: "antifriz nasıl seçilir", slug: "antifriz-secerken-renk-mi-uretici-standardi-mi-onemlidir", target: "/kategori/antifriz", anchor: "aracınıza uygun antifrizler", related: ["B28"], priority: "P1", week: 1, outline: ["Üretici standardı", "karışım ve konsantrasyon", "ürün etiketini okuma"] },
  { id: "B03", cluster: "Parça seçimi", title: "Orijinal, OEM ve eşdeğer yedek parça arasındaki farklar", query: "orijinal OEM eşdeğer parça farkı", slug: "orijinal-oem-ve-esdeger-yedek-parca-arasindaki-farklar", target: "/", anchor: "yedek parça seçenekleri", related: ["B01"], priority: "P1", week: 2, outline: ["Terimlerin doğru anlamı", "üretici ve parça numarası", "uygunluk belgeleri"] },
  { id: "B04", cluster: "Silecek ve Aksesuar", title: "Silecek ölçüsü ve bağlantı tipi nasıl belirlenir?", query: "silecek ölçüsü nasıl bulunur", slug: "silecek-olcusu-ve-baglanti-tipi-nasil-belirlenir", target: "/kategori/silecek", anchor: "silecek seçenekleri", related: ["B01"], priority: "P1", week: 2, outline: ["Ön ve arka ölçüler", "bağlantı tipleri", "modele göre doğrulama"] },
  { id: "B05", cluster: "Fren Sistemi", title: "Fren balatası ne zaman değişir? Aşınma belirtileri", query: "fren balatası ne zaman değişir", slug: "fren-balatasi-ne-zaman-degisir-asinma-belirtileri", target: "/kategori/fren-balatasi", anchor: "uyumlu fren balataları", related: ["B09"], priority: "P1", week: 3, outline: ["Aşınma belirtileri", "servis kontrolü", "araç varyantına göre parça seçimi"] },
  { id: "B06", cluster: "Filtreler ve Periyodik Bakım", title: "Yağ filtresi seçerken motor kodu neden önemlidir?", query: "yağ filtresi nasıl seçilir", slug: "yag-filtresi-secerken-motor-kodu-neden-onemlidir", target: "/kategori/yag-filtresi", anchor: "yağ filtresi seçenekleri", related: ["B08"], priority: "P1", week: 3, outline: ["Motor kodu", "filtre tipi ve ölçüleri", "OEM numarası"] },
  { id: "B07", cluster: "Triger ve Kayışlar", title: "Triger kayışı ve zinciri arasındaki farklar", query: "triger kayışı zinciri farkı", slug: "triger-kayisi-ve-zinciri-arasindaki-farklar", target: "/kategori/kayis", anchor: "triger ve kayış parçaları", related: ["B17"], priority: "P1", week: 4, outline: ["Çalışma farkları", "motor tipine göre kullanım", "üretici bakım planı"] },
  { id: "B08", cluster: "Fiat Egea", title: "Fiat Egea bakımında filtre uyumu nasıl kontrol edilir?", query: "Fiat Egea filtre seçimi", slug: "fiat-egea-bakiminda-filtre-uyumu-nasil-kontrol-edilir", target: "/fiat/egea/filtre", anchor: "Fiat Egea filtreleri", related: ["B06"], priority: "P1", week: 4, outline: ["Motor ve üretim tarihi", "dört filtre türü", "parça numarası kontrolü"] },
  { id: "B09", cluster: "Fren Sistemi", title: "Balata ve fren diski ne zaman birlikte değerlendirilmelidir?", query: "fren diski balata birlikte değişir mi", slug: "balata-ve-fren-diski-ne-zaman-birlikte-degerlendirilmelidir", target: "/kategori/fren-diski", anchor: "fren diski seçenekleri", related: ["B05"], priority: "P1", week: 5, outline: ["Disk kalınlığı ve yüzey", "balata uyumu", "servis ölçümünün önemi"] },
  { id: "B10", cluster: "Renault Clio", title: "Renault Clio fren balatasında kasa ve motor farkları", query: "Renault Clio fren balatası seçimi", slug: "renault-clio-fren-balatasinda-kasa-ve-motor-farklari", target: "/renault/clio/fren-balatasi", anchor: "Renault Clio fren balataları", related: ["B05"], priority: "P1", week: 5, outline: ["Nesil ve kasa", "fren sistemi varyantı", "şasi ile doğrulama"] },
  { id: "B11", cluster: "Filtreler ve Periyodik Bakım", title: "Karbonlu ve standart polen filtresi arasındaki farklar", query: "karbonlu polen filtresi farkı", slug: "karbonlu-ve-standart-polen-filtresi-arasindaki-farklar", target: "/kategori/polen-filtresi", anchor: "polen filtreleri", related: ["B18"], priority: "P1", week: 6, outline: ["Filtre yapıları", "kullanım koşulları", "ölçü ve montaj yönü"] },
  { id: "B12", cluster: "Debriyaj ve Şanzıman", title: "Debriyaj setinde hangi parçalar bulunur?", query: "debriyaj seti içinde neler var", slug: "debriyaj-setinde-hangi-parcalar-bulunur", target: "/kategori/debriyaj-seti", anchor: "debriyaj setleri", related: ["B25"], priority: "P1", week: 6, outline: ["Baskı ve balata", "rulman türleri", "set kapsamını doğrulama"] },
  { id: "B13", cluster: "Süspansiyon ve Alt Takım", title: "Amortisör arızası hangi belirtilerle anlaşılır?", query: "amortisör arıza belirtileri", slug: "amortisor-arizasi-hangi-belirtilerle-anlasilir", target: "/kategori/amortisor", anchor: "amortisör seçenekleri", related: ["B21"], priority: "P1", week: 7, outline: ["Belirtiler", "takoz ve yay ilişkisi", "ön ve arka aks uyumu"] },
  { id: "B14", cluster: "Motor Parçaları", title: "Yağ kaçağı ve yağ eksiltme arasındaki farklar", query: "yağ kaçağı yağ eksiltme farkı", slug: "yag-kacagi-ve-yag-eksiltme-arasindaki-farklar", target: "/kategori/conta-sibop-lastik", anchor: "motor contaları ve supap lastikleri", related: ["B31"], priority: "P1", week: 7, outline: ["Dış kaçak ve tüketim ayrımı", "kontrol noktaları", "parça siparişinden önce teşhis"] },
  { id: "B15", cluster: "Ateşleme Sistemi", title: "Ateşleme bobini ve buji arızası nasıl ayırt edilir?", query: "bobin buji arızası farkı", slug: "atesleme-bobini-ve-buji-arizasi-nasil-ayirt-edilir", target: "/kategori/bobin-modul", anchor: "ateşleme bobinleri", related: ["B29"], priority: "P1", week: 8, outline: ["Ortak belirtiler", "arıza kodlarının sınırı", "motor koduna göre seçim"] },
  { id: "B16", cluster: "Fren Sistemi", title: "Fren balatası neden ses yapar? Kontrol edilmesi gerekenler", query: "fren balatası neden ses yapar", slug: "fren-balatasi-neden-ses-yapar-kontrol-edilmesi-gerekenler", target: "/kategori/fren-balatasi", anchor: "fren balatası seçenekleri", related: ["B05"], priority: "P1", week: 8, outline: ["Sesin oluştuğu koşullar", "disk ve montaj bileşenleri", "servis kontrolü"] },
  { id: "B17", cluster: "Triger ve Kayışlar", title: "Triger seti alırken kutu içeriği nasıl kontrol edilir?", query: "triger seti seçimi", slug: "triger-seti-alirken-kutu-icerigi-nasil-kontrol-edilir", target: "/kategori/triger-seti-eksantrik", anchor: "triger setleri", related: ["B07"], priority: "P2", week: 9, outline: ["Kayış ve gergiler", "devirdaim dahil mi", "motor koduna göre set kapsamı"] },
  { id: "B18", cluster: "Filtreler ve Periyodik Bakım", title: "Hava filtresinin kirlendiği nasıl anlaşılır?", query: "hava filtresi tıkanma belirtileri", slug: "hava-filtresinin-kirlendigi-nasil-anlasilir", target: "/kategori/hava-filtresi", anchor: "hava filtreleri", related: ["B11"], priority: "P2", week: 9, outline: ["Görsel kontrol", "kullanım koşulları", "bakım planı ve uyum"] },
  { id: "B19", cluster: "Filtreler ve Periyodik Bakım", title: "Yakıt filtresinde sensörlü ve sensörsüz parça farkı", query: "sensörlü sensörsüz mazot filtresi farkı", slug: "yakit-filtresinde-sensorlu-ve-sensorsuz-parca-farki", target: "/kategori/yakit-filtresi", anchor: "yakıt filtreleri", related: ["B06"], priority: "P2", week: 10, outline: ["Su sensörü", "bağlantı ve ölçüler", "OEM numarası eşleştirme"] },
  { id: "B20", cluster: "Motor Soğutma", title: "Devirdaim pompası ve triger seti neden birlikte incelenir?", query: "devirdaim triger ilişkisi", slug: "devirdaim-pompasi-ve-triger-seti-neden-birlikte-incelenir", target: "/kategori/isitma-devirdaim", anchor: "devirdaim pompaları", related: ["B17"], priority: "P2", week: 10, outline: ["Tahrik sistemi farkları", "sızıntı kontrolü", "üretici prosedürü"] },
  { id: "B21", cluster: "Süspansiyon ve Alt Takım", title: "Salıncak, rotil ve burç arasındaki farklar", query: "salıncak rotil burç farkı", slug: "salincak-rotil-ve-burc-arasindaki-farklar", target: "/kategori/salincak", anchor: "salıncak seçenekleri", related: ["B13"], priority: "P2", week: 11, outline: ["Parçaların görevleri", "komple ve tekil parça", "araç ve taraf uyumu"] },
  { id: "B22", cluster: "Motor Soğutma", title: "Termostat arızasında hangi belirtiler görülebilir?", query: "termostat arıza belirtileri", slug: "termostat-arizasinda-hangi-belirtiler-gorulebilir", target: "/kategori/isitma-termostat", anchor: "termostat seçenekleri", related: ["B28"], priority: "P2", week: 11, outline: ["Açık ve kapalı kalma", "hararet göstergesi", "diğer olası nedenler"] },
  { id: "B23", cluster: "Peugeot 208", title: "Peugeot 208 parça seçiminde motor kodu ve üretim tarihi", query: "Peugeot 208 yedek parça seçimi", slug: "peugeot-208-parca-seciminde-motor-kodu-ve-uretim-tarihi", target: "/peugeot/208", anchor: "Peugeot 208 yedek parçaları", related: ["B01"], priority: "P2", week: 12, outline: ["Motor varyantları", "üretim tarihi", "OEM ve şasi doğrulaması"] },
  { id: "B24", cluster: "Opel Astra", title: "Opel Astra için kasa koduna göre yedek parça seçimi", query: "Opel Astra kasa kodu parça seçimi", slug: "opel-astra-icin-kasa-koduna-gore-yedek-parca-secimi", target: "/opel/astra", anchor: "Opel Astra yedek parçaları", related: ["B01"], priority: "P2", week: 12, outline: ["Kasa nesli", "motor ve şanzıman", "üretim aralığı"] },
  { id: "B25", cluster: "Debriyaj ve Şanzıman", title: "Volan ve debriyaj seti arasındaki ilişki", query: "volan debriyaj seti ilişkisi", slug: "volan-ve-debriyaj-seti-arasindaki-iliski", target: "/kategori/volan", anchor: "volan seçenekleri", related: ["B12"], priority: "P2", week: 13, outline: ["Tek ve çift kütleli yapı", "set uyumu", "teknik kontrol"] },
  { id: "B26", cluster: "Süspansiyon ve Alt Takım", title: "Teker rulmanı ve porya arasındaki farklar", query: "porya rulman farkı", slug: "teker-rulmani-ve-porya-arasindaki-farklar", target: "/kategori/teker-poryasi", anchor: "teker poryaları", related: ["B13"], priority: "P2", week: 13, outline: ["Rulman ve porya grubu", "ABS halkası", "aks ve taraf bilgisi"] },
  { id: "B27", cluster: "Triger ve Kayışlar", title: "V kayışından gelen ses hangi parçalarla ilişkili olabilir?", query: "V kayışı neden ses yapar", slug: "v-kayisindan-gelen-ses-hangi-parcalarla-iliskili-olabilir", target: "/kategori/kanalli-kayis", anchor: "V kayışı seçenekleri", related: ["B17"], priority: "P2", week: 14, outline: ["Kayış ve gergiler", "ses koşulları", "ölçü ve kanal sayısı"] },
  { id: "B28", cluster: "Motor Soğutma", title: "Radyatör kapağı su eksiltmeye neden olabilir mi?", query: "radyatör kapağı su eksiltir mi", slug: "radyator-kapagi-su-eksiltmeye-neden-olabilir-mi", target: "/kategori/depo-radyator-kapak", anchor: "radyatör ve depo kapakları", related: ["B22"], priority: "P2", week: 14, outline: ["Basınç değeri", "sızdırmazlık", "diğer kaçak ihtimalleri"] },
  { id: "B29", cluster: "Ateşleme Sistemi", title: "Kızdırma bujisi ve ateşleme bujisi arasındaki farklar", query: "kızdırma bujisi ateşleme bujisi farkı", slug: "kizdirma-bujisi-ve-atesleme-bujisi-arasindaki-farklar", target: "/kategori/kizdirma-bujisi", anchor: "kızdırma bujileri", related: ["B15"], priority: "P2", week: 15, outline: ["Dizel ve benzinli kullanım", "görev", "voltaj ve motor uyumu"] },
  { id: "B30", cluster: "Elektrik ve Sensörler", title: "ABS sensörü arızasında doğru teşhis neden önemlidir?", query: "ABS sensörü arıza belirtileri", slug: "abs-sensoru-arizasinda-dogru-teshis-neden-onemlidir", target: "/kategori/abs-sensor", anchor: "ABS sensörleri", related: ["B26"], priority: "P2", week: 15, outline: ["Sensör ve kablo", "porya ilişkisi", "arıza kodunu doğrulama"] },
  { id: "B31", cluster: "Motor Parçaları", title: "Turbo seçiminde OEM numarası ve yağlama hattı kontrolü", query: "turbo seçimi OEM numarası", slug: "turbo-seciminde-oem-numarasi-ve-yaglama-hatti-kontrolu", target: "/kategori/turbo", anchor: "turbo seçenekleri", related: ["B14"], priority: "P2", week: 16, outline: ["Motor ve turbo kodu", "parça eşleştirme", "yağlama ve çevre parçalar"] },
  { id: "B32", cluster: "Elektrik ve Sensörler", title: "Marş motoru ve alternatörün görevleri nelerdir?", query: "marş motoru alternatör farkı", slug: "mars-motoru-ve-alternatorun-gorevleri-nelerdir", target: "/kategori/sarj-mars-dinamosu", anchor: "marş ve şarj dinamosu seçenekleri", related: ["B30"], priority: "P2", week: 16, outline: ["Çalıştırma ve şarj", "elektriksel kontroller", "güç ve soket uyumu"] },
  { id: "B33", cluster: "Süspansiyon ve Alt Takım", title: "Aks körüğü yırtıldığında hangi parçalar kontrol edilir?", query: "aks körüğü yırtılması", slug: "aks-korugu-yirtildiginda-hangi-parcalar-kontrol-edilir", target: "/kategori/koruk", anchor: "körük seçenekleri", related: ["B26"], priority: "P2", week: 17, outline: ["İç ve dış körük", "gres ve mafsal", "ölçü ve aks uyumu"] },
  { id: "B34", cluster: "Direksiyon Sistemi", title: "Direksiyon kutusu ve pompası arızalarında görülen belirtiler", query: "direksiyon kutusu pompası arıza belirtileri", slug: "direksiyon-kutusu-ve-pompasi-arizalarinda-gorulen-belirtiler", target: "/kategori/direksiyon", anchor: "direksiyon sistemi parçaları", related: ["B21"], priority: "P2", week: 17, outline: ["Elektrikli ve hidrolik sistem", "ortak belirtiler", "doğru teşhis"] },
  { id: "B35", cluster: "Aydınlatma", title: "Far seçiminde halojen, LED ve xenon uyumu", query: "halojen LED xenon far uyumu", slug: "far-seciminde-halojen-led-ve-xenon-uyumu", target: "/kategori/aydinlatma", anchor: "aydınlatma parçaları", related: ["B36"], priority: "P2", week: 18, outline: ["Orijinal donanım", "soket ve far gövdesi", "uygun ürün onayı"] },
  { id: "B36", cluster: "Aydınlatma", title: "Stop lambasında sağ, sol, iç ve dış parça ayrımı", query: "stop lambası sağ sol iç dış farkı", slug: "stop-lambasinda-sag-sol-ic-ve-dis-parca-ayrimi", target: "/kategori/aydinlatma", anchor: "stop ve aydınlatma parçaları", related: ["B35"], priority: "P2", week: 18, outline: ["Taraf tanımı", "bagaj ve çamurluk tarafı", "makyaj farkı"] },
  { id: "B37", cluster: "Kaporta ve Dış Donanım", title: "Tampon alırken makyaj, sensör deliği ve paket farkları", query: "tampon seçimi sensör deliği makyaj farkı", slug: "tampon-alirken-makyaj-sensor-deligi-ve-paket-farklari", target: "/kategori/tampon", anchor: "tampon seçenekleri", related: ["B38"], priority: "P3", week: 19, outline: ["Kasa ve üretim yılı", "sensör ve far yıkama", "paket farkları"] },
  { id: "B38", cluster: "Kaporta ve Dış Donanım", title: "Dış ayna seçiminde soket, ısıtma ve katlanma farkları", query: "dikiz aynası soket ısıtmalı katlanır farkı", slug: "dis-ayna-seciminde-soket-isitma-ve-katlanma-farklari", target: "/kategori/ayna", anchor: "dış ayna seçenekleri", related: ["B37"], priority: "P3", week: 19, outline: ["Pin sayısı", "elektrikli işlevler", "sağ ve sol uyumu"] },
  { id: "B39", cluster: "Kaporta ve Dış Donanım", title: "Bagaj amortisöründe kuvvet değeri ve uzunluk nasıl okunur?", query: "bagaj amortisörü Newton değeri uzunluk", slug: "bagaj-amortisorunde-kuvvet-degeri-ve-uzunluk-nasil-okunur", target: "/kategori/bagaj-amortisoru", anchor: "bagaj amortisörleri", related: ["B40"], priority: "P3", week: 20, outline: ["Newton değeri", "açık ve kapalı uzunluk", "bağlantı uçları"] },
  { id: "B40", cluster: "Kaporta ve Dış Donanım", title: "Cam krikosunda motorlu ve motorsuz parça farkı", query: "motorlu motorsuz cam krikosu farkı", slug: "cam-krikosunda-motorlu-ve-motorsuz-parca-farki", target: "/kategori/cam-krikosu", anchor: "cam krikosu seçenekleri", related: ["B38"], priority: "P3", week: 20, outline: ["Mekanizma ve motor", "soket", "kapı ve kasa uyumu"] },
  { id: "B41", cluster: "Klima ve Isıtma", title: "Klima kompresörü seçiminde parça kodu ve soket uyumu", query: "klima kompresörü nasıl seçilir", slug: "klima-kompresoru-seciminde-parca-kodu-ve-soket-uyumu", target: "/kategori/isitma-klima-kompresor", anchor: "klima kompresörleri", related: ["B42"], priority: "P3", week: 21, outline: ["OEM numarası", "kasnak ve soket", "sistem özellikleri"] },
  { id: "B42", cluster: "Klima ve Isıtma", title: "Araç kliması soğutmuyorsa hangi parçalar kontrol edilir?", query: "araç kliması neden soğutmuyor", slug: "arac-klimasi-sogutmuyorsa-hangi-parcalar-kontrol-edilir", target: "/kategori/isitma-klima-rad", anchor: "klima radyatörleri", related: ["B41"], priority: "P3", week: 21, outline: ["Kaçak ve fan", "radyatör ve kompresör", "serviste sistem kontrolü"] },
  { id: "B43", cluster: "Yağlar ve Bakım Sıvıları", title: "Motor yağı seçiminde viskozite ve üretici onayı", query: "motor yağı üretici onayı viskozite", slug: "motor-yagi-seciminde-viskozite-ve-uretici-onayi", target: "/kategori/motor-ve-sanz-yag", anchor: "motor ve şanzıman yağları", related: ["B02"], priority: "P3", week: 22, outline: ["Viskozite sınıfı", "üretici onayı", "motor ve kullanım kılavuzu"] },
  { id: "B44", cluster: "Yağlar ve Bakım Sıvıları", title: "DOT 3, DOT 4 ve DOT 5.1 fren hidroliği seçimi", query: "DOT 3 DOT 4 DOT 5.1 farkı", slug: "dot-3-dot-4-ve-dot-5-1-fren-hidroligi-secimi", target: "/kategori/dot-fren-hidrolik", anchor: "fren hidroliği seçenekleri", related: ["B05"], priority: "P3", week: 22, outline: ["Üretici gereksinimi", "standartların farkı", "uyumsuz ürünleri karıştırmama"] },
  { id: "B45", cluster: "Volkswagen Golf", title: "Volkswagen Golf bakım parçalarında nesil ve motor farkları", query: "Volkswagen Golf bakım parçası seçimi", slug: "volkswagen-golf-bakim-parcalarinda-nesil-ve-motor-farklari", target: "/volkswagen/golf", anchor: "Volkswagen Golf yedek parçaları", related: ["B06"], priority: "P3", week: 23, outline: ["Golf nesli", "motor ve şanzıman kodu", "filtre ve fren uyumu"] },
  { id: "B46", cluster: "Ford Focus", title: "Ford Focus için filtre ve fren parçası nasıl seçilir?", query: "Ford Focus filtre fren parçası seçimi", slug: "ford-focus-icin-filtre-ve-fren-parcasi-nasil-secilir", target: "/ford/focus", anchor: "Ford Focus yedek parçaları", related: ["B05"], priority: "P3", week: 23, outline: ["Kasa ve motor", "fren varyantı", "OEM eşleştirme"] },
  { id: "B47", cluster: "Fiat Doblo", title: "Fiat Doblo parça seçiminde kasa ve motor uyumu", query: "Fiat Doblo yedek parça uyumu", slug: "fiat-doblo-parca-seciminde-kasa-ve-motor-uyumu", target: "/fiat/doblo", anchor: "Fiat Doblo yedek parçaları", related: ["B08"], priority: "P3", week: 24, outline: ["Kasa ve üretim yılı", "ticari gövde farkları", "motor ve OEM"] },
  { id: "B48", cluster: "Toyota Corolla", title: "Toyota Corolla için nesil ve motora göre bakım parçası seçimi", query: "Toyota Corolla bakım parçası seçimi", slug: "toyota-corolla-icin-nesil-ve-motora-gore-bakim-parcasi-secimi", target: "/toyota/corolla", anchor: "Toyota Corolla yedek parçaları", related: ["B06"], priority: "P3", week: 24, outline: ["Nesil ve motor", "hibrit ve benzinli ayrımı", "parça numarası"] },
];

export function seoCategory(slug: string): SeoCategoryEntry | undefined {
  return Object.prototype.hasOwnProperty.call(SEO_CATEGORIES, slug) ? SEO_CATEGORIES[slug] : undefined;
}

/** Üst grubun /kategori/ slug'ı (haritadaki kimlikten). */
export function seoCategoryParentSlug(entry: SeoCategoryEntry): string | undefined {
  if (!entry.parentId) return undefined;
  return Object.keys(SEO_CATEGORIES).find((s) => SEO_CATEGORIES[s]!.id === entry.parentId);
}

/** Satış sayfası /kategori/<slug> ise slug'ı. */
export function seoTargetCategorySlug(topic: SeoBlogTopic): string | undefined {
  const m = /^\/kategori\/([^/?#]+)$/.exec(topic.target);
  return m?.[1];
}
