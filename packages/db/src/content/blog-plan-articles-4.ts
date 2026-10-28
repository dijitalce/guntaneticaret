import type { PlanArticle } from "./blog-plan-types";

/** B37–B48. Teknik değerler (kilometre, tork, basınç, viskozite sınıfı vb.) bilerek yazılmaz: araç kullanım kılavuzu ve üretici dokümanı esas alınır. */
export const PLAN_ARTICLES_4: Record<string, PlanArticle> = {
  B37: {
    kw: "tampon alırken",
    meta: "Tampon alırken makyaj, sensör deliği ve paket farkları nasıl kontrol edilir? Kasa ve üretim yılı ile far yıkama uyumu rehberi.",
    intro:
      "Tampon alırken en sık yapılan hata, yalnızca marka ve modele bakmaktır. Aynı modelin makyajlı ve makyajsız kasaları, park sensörlü ve sensörsüz versiyonları, farklı donanım paketleri için ayrı tamponlar bulunur. Bu yazıda kasa ve üretim yılını, sensör ve far yıkama deliklerini ve paket farklarını nasıl kontrol edeceğinizi anlatıyoruz.",
    sections: [
      ["Kasa ve üretim yılı neden belirleyicidir?", "Tampon, aracın kasa tasarımına göre şekillenir ve her nesil kasada farklıdır. Aynı nesil içinde makyaj sonrası tampon çizgileri, hava girişleri ve sis lambası yuvaları değişebilir. Bu nedenle üretim yılını ve kasa kodunu bilmeden sipariş vermek riskli olur. Ruhsattaki ilk tescil tarihi ile gerçek üretim tarihi farklı olabilir; şasi numarası bu konuda en kesin bilgiyi verir. Ürün sayfasındaki yıl aralığını aracınızla karşılaştırın ve geçiş dönemi araçlarda ek doğrulama isteyin."],
      ["Makyajlı ve makyajsız farkı", "Makyaj, üreticinin kasa üzerinde yaptığı görsel güncellemedir ve tampon, far, ızgara gibi parçaları kapsar. Makyajlı bir araca makyajsız tampon takılamaz ya da takılsa bile far ve kaput çizgileriyle uyum sağlamaz. Bazı durumlarda tampon uyumlu olsa bile bağlantı noktaları farklı olabilir. Makyaj dönemini araç üzerindeki far tasarımından ve şasi numarasından doğrulayın. Ürün açıklamasında 'makyajlı' ya da 'makyajsız' ifadesinin net yer almasına dikkat edin."],
      ["Park sensörü deliği ve sensör uyumu", "Park sensörlü araçların tamponlarında sensör delikleri bulunur; sensörsüz araçların tamponlarında ise bu delikler yoktur. Sensörlü bir araca sensör deliksiz tampon takarsanız sensörler yerleşemez. Tersi durumda delik açmak gerekir ve bu işlem ölçüm doğruluğunu bozabilir. Sensör sayısı da araçlara göre değişir. Ürün sayfasında sensör delik sayısını kontrol edin ve eski tamponla karşılaştırın. Sensörler genellikle tampona dahil gelmez, eski tampondan aktarılır."],
      ["Far yıkama, sis lambası ve diğer delikler", "Bazı araçlarda tamponda far yıkama fıskiyesi için delikler, sis lambası yuvaları, çekme kancası kapağı için bölge ve radar ya da kamera için yuvalar bulunur. Donanım paketine göre bu deliklerin hangileri olduğu değişir. Eksik ya da fazla delik, montajı zorlaştırır ve görünümü bozar. Aracınızın donanımını bilin ve ürün açıklamasındaki delik listesini kontrol edin. Emin değilseniz eski tamponun fotoğrafını satıcıyla paylaşın."],
      ["Paket farkları", "Spor ya da üst donanım paketlerinde tampon tasarımı standart paketten farklı olabilir. Ön alt spoyler, arka difüzör ve farklı hava girişleri bu paketlere özgüdür. Bu nedenle donanım paketinizi belirleyin; araç belgelerinde ya da şasi numarası sorgusunda bu bilgi bulunur. Standart paket aracınıza paketli tampon takmak teknik olarak mümkün görünse de sensör ve far yıkama gibi bağlantılar uyuşmayabilir."],
      ["Boyalı ve boyasız tampon", "Tamponlar çoğunlukla boyasız ve astarlı olarak satılır; boyatmanız gerekir. Bazı tamponlar ise renk koduna göre boyalı gelir. Aracınızın renk kodunu kapı eşiğindeki ya da motor bölmesindeki etiketten öğrenin. Boya maliyetini ve süresini hesaba katın. Boyanın doğru renk tonunda ve kalitede olması için güvenilir bir boya atölyesi seçin. Tampon takılmadan önce boyanması ve kurumaya bırakılması daha doğru sonuç verir."],
      ["Montaj ve bağlantı parçaları", "Tampon değişiminde braketler, klipsler, vidalar ve alt koruma parçaları da yenilenmesi gerekebilir. Kırık braketler tamponun yerine tam oturmasını engeller. Tampon ürünü çoğu zaman bu parçalarla gelmez; ayrıca temin edilir. Montajdan önce eski tamponu sökerek hangi bağlantı parçalarının hasarlı olduğunu görün. Yeni tamponu takmadan önce deneme yaparak far, kaput ve çamurluk ile aralıkları kontrol edin."],
      ["Uyumluluk kontrol listesi", "Sipariş öncesinde kasa kodunu, üretim yılını, makyaj durumunu, sensör sayısını, far yıkama ve sis lambası donanımını ve renk kodunu belirleyin. Ürün sayfasındaki uyumluluk listesiyle karşılaştırın. Satıcıdan şasi numarasıyla teyit isteyin. Teslimatta tamponu kutudan çıkarıp hasar kontrolü yapın ve eski tamponla yan yana koyup deliklerini, bağlantı noktalarını karşılaştırın."],
    ],
    faq: [
      ["Makyajsız tampon makyajlı araca takılır mı?", "Genellikle uymaz; bağlantı noktaları ve far, kaput çizgileri farklıdır."],
      ["Park sensörleri tampona dahil gelir mi?", "Çoğu zaman gelmez; sensörler eski tampondan aktarılır, delik sayısını kontrol edin."],
    ],
  },
  B38: {
    kw: "dış ayna seçiminde",
    meta: "Dış ayna seçiminde soket, ısıtma ve katlanma farkları nelerdir? Pin sayısı, elektrikli işlevler ve sağ-sol uyumu için rehber.",
    intro:
      "Dış ayna seçiminde yalnızca camın ya da gövdenin uyması yetmez; soket yapısı, ısıtma ve elektrikli katlanma gibi işlevler de uyumu belirler. Aynı aracın farklı donanım seviyelerinde farklı aynalar kullanılır. Bu yazıda pin sayısını, elektrikli işlevleri ve sağ ile sol ayrımını nasıl kontrol edeceğinizi anlatıyoruz.",
    sections: [
      ["Ayna türleri: komple ayna, ayna camı ve kapak", "Dış ayna üç ana parçadan oluşur: ayna camı, ayna gövdesi ve kapak. Kırılan camı yalnızca cam olarak değiştirebilir, kapağı ayrı yenileyebilir ya da komple ayna alabilirsiniz. Komple ayna daha pahalıdır ama motor ve işlevleri de içerir. Ayna camında ısıtma ve dönüş desteği uyumu önemlidir. Hasarın kapsamına göre ihtiyacınız olan parçayı belirleyin. Ürün sayfasında hangi parçanın satıldığını net okuyun."],
      ["Soket ve pin sayısı", "Elektrikli aynaların kablo bağlantısı, farklı pin sayılarına sahip soketlerle yapılır. Pin sayısı, aynanın taşıdığı işlevlere göre değişir: yalnızca ayarlı ayna, ısıtmalı ayna, katlanır ayna ya da sinyal lambalı ayna gibi. Eski aynanın soketini sayın ve ürün sayfasındaki pin sayısıyla karşılaştırın. Pin sayısı uymayan ayna, soket takılsa bile bazı işlevleri çalıştırmaz ya da hiç çalışmaz. Bu nedenle soket kontrolü ilk adımdır."],
      ["Isıtmalı ayna", "Isıtmalı aynalar, camın arkasında ince bir rezistans bulunan ve soğuk havada buğu ya da buzu eriten ürünlerdir. Aracınız ısıtmalı ayna donanımına sahipse, takılacak ayna da ısıtmalı olmalıdır. Isıtmasız ayna takarsanız ısıtma düğmesi çalışmaz. Isıtmalı ayna için soket pin sayısı daha fazladır. Aracınızın aynasında ısıtma olup olmadığını eski ayna camının arkasından ya da düğmeden anlayabilirsiniz."],
      ["Elektrikli katlanma", "Bazı araçlarda aynalar, düğmeyle ya da kilitleme sırasında otomatik olarak katlanır. Bu işlev için aynada ek bir motor ve bağlantı bulunur. Katlanmayan manuel aynaya sahip bir araca elektrikli katlanır ayna takarsanız işlev çalışmayabilir; tersi durumda ise ayna motoru ve kablolar eksik kalır. Aracınızın katlanma tipini bilin ve ürün açıklamasında katlanma özelliğini kontrol edin."],
      ["Sinyal lambası, kamera ve diğer donanımlar", "Birçok araçta ayna gövdesinde sinyal lambası, yer aydınlatma lambası, kör nokta uyarı sensörü ya da 360 derece kamera bulunur. Bu donanımlar aynaya özgü kablo ve soketler gerektirir. Donanımlı bir araca donanımsız ayna takmak işlev kaybına yol açar. Ürün sayfasında ayna üzerindeki donanımların listesini kontrol edin ve eski aynanın özellikleriyle birebir eşleştirin."],
      ["Sağ ve sol uyumu", "Sağ ve sol aynalar birbirinden farklıdır; cam şekli, görüş açısı ve gövde yapısı değişir. Sürücü tarafı ve yolcu tarafı aynalarının camı genellikle farklı kavisli yapıdadır. Taraf tanımı, aracın içinden bakıldığında belirlenir: sol taraf sürücü tarafıdır. Sipariş verirken tarafı net belirtin ve ürün sayfasında hangi tarafın satıldığına bakın."],
      ["Renk ve boya", "Ayna kapakları boyasız, astarlı ya da araç rengine göre boyalı olabilir. Boyasız kapak araç rengine boyatılmalıdır. Aracın renk kodunu doğrulayın ve boyanın ton farkı yaratmaması için güvenilir bir atölye tercih edin. Siyah ya da gümüş gibi sabit renkli kapaklar da bulunabilir; bunların aracınızla uyumlu olduğundan emin olun."],
      ["Montaj ve test", "Ayna montajında kapı panelinin sökülmesi ve kablo bağlantısının yapılması gerekir. Montajdan sonra ayna ayarı, ısıtma, katlanma ve sinyal fonksiyonlarını test edin. Soket tam oturmalı ve su sızdırmazlığı korunmalıdır. Contanın doğru yerleştiğinden emin olun. Montajı kapı panelleri konusunda deneyimli bir ustaya yaptırmak, panel klipslerinin kırılmasını önler."],
    ],
    faq: [
      ["Isıtmasız ayna ısıtmalı araca takılır mı?", "Takılabilir ancak ısıtma çalışmaz; ayna donanımı aracınızla aynı olmalıdır."],
      ["Ayna soketi pin sayısı neden önemlidir?", "Pin sayısı aynanın hangi işlevleri taşıdığını belirler; uyuşmazsa işlevler çalışmaz."],
    ],
  },
  B39: {
    kw: "bagaj amortisöründe",
    meta: "Bagaj amortisöründe kuvvet değeri ve uzunluk nasıl okunur? Newton değeri, açık ve kapalı uzunluk ile bağlantı uçları rehberi.",
    intro:
      "Bagaj amortisöründe kuvvet değeri ve uzunluk, doğru ürünü seçmenin iki temel ölçütüdür. Kuvvet değeri bagaj kapağını tutacak gücü, uzunluk ise kapağın açılma mesafesini belirler. Bu yazıda Newton değerini, açık ve kapalı uzunluğu ve bağlantı uçlarını nasıl okuyacağınızı anlatıyoruz.",
    sections: [
      ["Bagaj amortisörü ne işe yarar?", "Bagaj amortisörü, gazlı bir pistonlu yapıdır ve bagaj kapağını ya da kaputu açık tutar, kapatırken de hareketi yumuşatır. İçindeki gaz basıncı kapağın ağırlığını dengeler. Zamanla gaz kaybeder ve kapak kendi ağırlığıyla yavaşça iner ya da hiç açık kalmaz. Bu durum yalnızca konfor değil, güvenlik sorunudur; kapak başa ya da ele düşebilir. Amortisörler çift olarak kullanılır ve genellikle birlikte değiştirilir."],
      ["Kuvvet değeri (Newton) nasıl okunur?", "Kuvvet değeri, amortisörün uygulayabileceği itme kuvvetini ifade eder ve Newton (N) cinsinden yazılır. Amortisör gövdesinde ya da ürün sayfasında bu değer belirtilir. Değer, bagaj kapağının ağırlığına ve donanımına göre belirlenir; spoyler, cam ısıtma ve kapak kilidi gibi ek donanımlar ağırlığı artırır. Düşük kuvvetli amortisör kapağı tutamaz, yüksek kuvvetli ise kapağı aşırı hızla açar ve menteşelere zarar verebilir. Eski amortisörün değerine ya da üretici listesine uyun."],
      ["Açık ve kapalı uzunluk", "Amortisörün kapalı uzunluğu, tamamen sıkıştırılmış halindeki boyudur; açık uzunluk ise tamamen uzamış halidir. İki değerin farkı strok boyunu verir. Bu ölçüler kapağın açılma açısını ve amortisörün yuvasına sığmasını belirler. Eski amortisörün boyunu uçtan uca ölçün ve ürün sayfasıyla karşılaştırın. Uzunluk uyumsuzsa amortisör takılamaz ya da kapak tam açılmaz."],
      ["Bağlantı uçları", "Amortisörün iki ucundaki bağlantılar, aracın kapağına ve gövdesine takılan rotilli ya da oluklu yapıdadır. Uç tipi, diş çapı ve geçme şekli araca özeldir. Bazı araçlarda uçlar klipsli, bazılarında vidalıdır. Yeni amortisörün uç tipinin eskisiyle aynı olduğunu kontrol edin. Bazı ürünlerde uçlar ayrı satılır ya da eskisinden aktarılır; ürün açıklamasını okuyun."],
      ["Çift olarak değişim", "Bagaj kapağında genellikle iki amortisör bulunur ve birinin zayıflaması diğerine fazla yük bindirir. Bu nedenle ikisinin birlikte değiştirilmesi önerilir. Sadece birini yenilemek kapağın dengesiz açılmasına ve menteşelerin eğilmesine yol açabilir. Yeni çift aynı üreticiden ve aynı kuvvet değerinde olmalıdır. Satın alırken adet bilgisine dikkat edin; bazı ürünler tek, bazıları çift satılır."],
      ["Kaput amortisörleri ile farkı", "Bazı araçlarda kaput da amortisörle açık tutulur. Kaput amortisörünün kuvvet ve uzunluk değerleri bagaj amortisöründen farklıdır. Ürün sayfasında hangi bölge için olduğunu doğrulayın. Aynı model araçta bagaj, kaput ve arka cam amortisörleri ayrı parçalardır. Karıştırmamak için parça numarasını eski amortisörle karşılaştırın."],
      ["Arıza belirtileri", "Kapağın açık kalmaması, kendi kendine inmesi, açılırken sarsıntı ya da amortisör gövdesinde yağ sızıntısı arızanın işaretleridir. Soğuk havada gaz basıncı düştüğü için belirtiler artabilir. Kapak tam açıkken tutmuyorsa değişim zamanı gelmiştir. Kapağı el ile tutarak amortisörü yenileyin; çıkarırken kapağın düşmemesi için destek kullanın."],
      ["Montaj güvenliği", "Amortisör içindeki gaz basınç altındadır; sökerken ve takarken kapağın düşmemesi için kapak sabitlenmelidir. Amortisörü hiçbir zaman delmeyin ve ateşe atmayın. Eski amortisörü atık olarak uygun noktaya teslim edin. Montajdan sonra kapağı birkaç kez açıp kapatarak çalışmasını test edin. Zorlanırsanız bir usta desteği alın."],
    ],
    faq: [
      ["Bagaj amortisörü Newton değeri neden önemlidir?", "Kapağı tutacak gücü belirler; çok düşük değer kapağı tutamaz, çok yüksek değer menteşelere zarar verebilir."],
      ["Bagaj amortisörü tek mi değişir?", "İki amortisör birlikte çalıştığı için genellikle çift olarak değiştirilmesi önerilir."],
    ],
  },
  B40: {
    kw: "cam krikosunda",
    meta: "Cam krikosunda motorlu ve motorsuz parça farkı nedir? Mekanizma ve motor, soket yapısı ile kapı ve kasa uyumu hakkında pratik rehber.",
    intro:
      "Cam krikosunda motorlu ve motorsuz parça farkı, doğru ürünü seçmenin ilk adımıdır. Cam krikosu, kapı camını aşağı yukarı hareket ettiren mekanizmadır; bazı araçlarda motorla birlikte, bazılarında ayrı satılır. Bu yazıda mekanizmayı, motoru, soket yapısını ve kapı ile kasa uyumunu anlatıyoruz.",
    sections: [
      ["Cam krikosu nasıl çalışır?", "Cam krikosu, kapı içinde bulunan ve cama bağlı bir ray ve halat ya da makas mekanizmasından oluşur. Elektrikli camlı araçlarda bir motor mekanizmayı döndürür; manuel camlı araçlarda ise kol çevirerek aynı iş yapılır. Mekanizma yıprandığında cam yavaş inebilir, sıkışabilir ya da düşebilir. Halat kopması, plastik klips kırılması ve ray aşınması en sık arızalardır."],
      ["Motorsuz cam krikosu", "Motorsuz krikoda yalnızca mekanizma bulunur, motor ayrıca takılır ya da eski motordan aktarılır. Motor sağlam ise yalnızca mekanizmayı değiştirmek daha ekonomik olabilir. Ancak motor ile mekanizmanın uyumlu olması şarttır; bağlantı yapısı uymazsa motor takılamaz. Ürün sayfasında motorun dahil olup olmadığını okuyun ve eski motorun bağlantı tipini kontrol edin."],
      ["Motorlu cam krikosu", "Motorlu kriko, mekanizma ve motorun birlikte geldiği komple ünitedir. Motor yanmışsa ya da mekanizma ile motor birlikte yıpranmışsa komple ünite tercih edilir. Montajı daha kolaydır ve uyum riski azalır. Motorun voltajı, soket yapısı ve dişli tipi araca uygun olmalıdır. Ürün açıklamasında 'motorlu' ifadesi ve soket pin sayısının belirtilmesine dikkat edin."],
      ["Motor ve soket uyumu", "Cam motorlarının soketleri, farklı pin sayısı ve şekline sahip olabilir. Bazı motorlarda yalnızca iki pin bulunur, bazılarında ise otomatik inme ve çarpma koruması için ek pinler olur. Eski motorun soketini inceleyin ve yeni ürünün soketiyle karşılaştırın. Soket farklıysa adaptör gerekebilir ya da ürün uymayabilir. Çarpma koruması ve tek dokunuş fonksiyonu olan araçlarda uyumlu motor seçimi özellikle önemlidir."],
      ["Kapı ve kasa uyumu", "Ön ve arka kapılar, sağ ve sol taraflar için kriko mekanizmaları farklıdır. Aynı modelin 3 kapılı ve 5 kapılı versiyonlarında kapı yapısı değişir. Kasa tipi ve üretim yılı da önemlidir. Ürün sayfasında kapı konumunu, tarafı ve kasa tipini kontrol edin. Yanlış taraf ya da kapı için alınan kriko montaj sırasında uymaz."],
      ["Arıza belirtileri", "Camın yavaş inip çıkması, takılması, çarpma sesi, düğmeye basınca motor sesi gelip camın hareket etmemesi, cam kapıya düşmesi ve cam eğrilmesi arızanın işaretleridir. Motor sesi geliyor ama cam hareket etmiyorsa mekanizma halatı ya da klipsi kopmuş olabilir; ses yoksa motor, düğme ya da sigorta kontrol edilmelidir. Bu ayrım doğru parçayı belirler."],
      ["Montaj ve kapı paneli", "Cam krikosu değişimi için kapı paneli sökülmeli, nem koruma filmi dikkatle kaldırılmalı ve cam geçici olarak sabitlenmelidir. Panel klipsleri kırılgandır; deneyimli bir usta bunları yeniler. Montajdan sonra camın iniş çıkış hareketi, çarpma koruması ve tek dokunuş fonksiyonları test edilmelidir. Nem koruma filmini yeniden yapıştırmak, kapı içine su girişini engeller."],
    ],
    faq: [
      ["Motorlu ve motorsuz kriko arasında seçim nasıl yapılır?", "Motor sağlamsa motorsuz mekanizma yeterli olabilir; motor da arızalıysa komple motorlu ünite tercih edilir."],
      ["Cam krikosu hangi belirtilerle bozulur?", "Yavaş hareket, takılma, düşme, sesli ama hareketsiz motor gibi belirtiler görülür."],
    ],
  },
  B41: {
    kw: "klima kompresörü",
    meta: "Klima kompresörü seçiminde parça kodu ve soket uyumu nasıl kontrol edilir? OEM numarası, kasnak ve sistem özellikleri rehberi.",
    intro:
      "Klima kompresörü, aracın klima sisteminin kalbidir ve doğru seçilmediğinde sistem verimli çalışmaz. Kompresörler araca, motora ve klima sistemine göre farklı yapılardadır; yalnızca marka ve modele bakarak seçim yapmak yanıltıcıdır. Bu yazıda OEM numarasını, kasnak ve soket uyumunu ve sistem özelliklerini anlatıyoruz.",
    sections: [
      ["Klima kompresörü ne yapar?", "Klima kompresörü, soğutucu akışkanı sıkıştırarak sistemde dolaştırır. Motordan kayışla tahrik edilir ve elektromanyetik bir kavrama ile devreye girer. Kompresör arızalandığında klima soğutmaz, sesli çalışır ya da hiç çalışmaz. Kompresörün iç aşınması metal parçacıkları üreterek tüm sisteme yayabilir; bu yüzden kompresör değişiminde sistem temizliği önemlidir."],
      ["OEM ve parça kodu ile eşleştirme", "Kompresörün üzerindeki üretici ya da OEM numarası, doğru ürünü bulmanın en güvenilir yoludur. Bu numarayı aratınca aynı özelliklere sahip kompresör seçenekleri listelenir. Numarayı eksiksiz girin ve aynı koda sahip farklı varyantları kontrol edin. Numara okunmuyorsa şasi numarası ve motor koduyla katalog sorgusu yapın. Ürün sayfasındaki araç uyumluluğunu da doğrulayın."],
      ["Kasnak ve kavrama uyumu", "Kompresör kasnağının çapı, kanal sayısı ve kavrama tipi araca özeldir. Kasnak, kayış tipine uymalıdır; farklı kanal sayısı ya da çap kayışın oturmasını bozar. Kasnak ve kavrama bazen kompresörle birlikte gelir, bazen ayrı satılır. Ürün açıklamasında 'kasnaklı' ya da 'kasnaksız' ifadesine bakın ve eski kompresörün kasnağıyla karşılaştırın."],
      ["Soket ve elektrik bağlantısı", "Kompresör kavramasının ve kontrol valfinin elektrik soketi, araca göre farklı yapıdadır. Pin sayısı ve konnektör şekli uymazsa kompresör takılamaz ya da kavrama devreye girmez. Eski kompresörün soketini ve kablo yapısını inceleyin. Değişken hacimli kompresörlerde ek kontrol valfi soketleri de bulunur; bunları ürün sayfasıyla karşılaştırın."],
      ["Sistem özellikleri ve akışkan tipi", "Klima sistemlerinde kullanılan soğutucu akışkan aracın üretim dönemine göre değişir ve kompresör bu akışkana uygun tasarlanmıştır. Kullanılan gaz tipi araç etiketinde yazar. Yanlış akışkana uygun kompresör sistemin verimini düşürür ya da zarar verir. Ayrıca kompresörde sabit ya da değişken hacimli yapı farkı vardır. Ürün sayfasında akışkan tipi ve kompresör tipi belirtilmelidir."],
      ["Montaj öncesi sistem temizliği", "Kompresör arızası sistemde metal tozu ve yağ kirliliği bırakabilir. Yeni kompresör takılırken kurutucu filtre ve gerekiyorsa genleşme valfi ya da kapiler boru yenilenmeli, sistem temizlenmelidir. Aksi halde yeni kompresör kısa sürede zarar görebilir. Yağ miktarı ve tipi de kompresöre uygun doldurulmalıdır. Bu işlemler servis ekipmanı gerektirir."],
      ["Gaz dolumu ve test", "Montaj sonrası sistem vakumlanmalı, uygun miktar ve tipte gaz ve yağ doldurulmalıdır. Kaçak testi ve basınç ölçümü yapılmalıdır. Hatalı gaz miktarı soğutmayı azaltır ve kompresöre zarar verir. İşlemi klima servisi yapabilen bir ustaya yaptırın ve yapılan işlem için fatura ve garanti belgesi isteyin."],
    ],
    faq: [
      ["Klima kompresörü seçerken ne gerekir?", "OEM ya da parça numarası, kasnak yapısı, soket tipi ve klima akışkanı bilgisi gerekir."],
      ["Kompresör değişince başka ne yenilenir?", "Kurutucu filtre, gerekiyorsa genleşme elemanı ve sistem yağı yenilenmeli, sistem temizlenmelidir."],
    ],
  },
  B42: {
    kw: "araç kliması",
    meta: "Araç kliması soğutmuyorsa hangi parçalar kontrol edilir? Kaçak ve fan, radyatör ve kompresör, serviste sistem kontrolü rehberi.",
    intro:
      "Araç kliması soğutmuyorsa nedeni tek bir parça olmayabilir. Gaz kaçağı, fan arızası, kompresör sorunu ya da filtre tıkanıklığı gibi birden fazla neden aynı belirtiyi verir. Bu yazıda sistemin hangi parçalarının kontrol edildiğini, kaçak ve fan, radyatör ve kompresör ilişkisini ve serviste yapılan kontrolleri anlatıyoruz.",
    sections: [
      ["Klima sistemi nasıl çalışır?", "Klima sistemi kapalı bir devredir. Kompresör akışkanı sıkıştırır, kondenser (klima radyatörü) ısıyı dışarı atar, kurutucu nemi tutar, genleşme valfi basıncı düşürür ve evaporatör kabin havasını soğutur. Bu parçalardan birinde sorun olduğunda soğutma azalır ya da kesilir. Sistem basınç altında çalıştığı için parçalar birbirine bağımlıdır; bu nedenle teşhis, sistemin bütününü kapsar."],
      ["Gaz kaçağı ve düşük gaz", "Klima gazı zamanla çok az miktarda azalabilir ancak belirgin düşüş kaçak anlamına gelir. Kaçak; boru bağlantılarında, contalarda, kondenserde ya da kompresör keçesinde olabilir. Gaz azaldıkça soğutma zayıflar ve kompresör yağsız çalıştığı için zarar görebilir. Yalnızca gaz tamamlamak geçici bir çözümdür; kaçağın bulunup giderilmesi gerekir. Servis, basınç ve kaçak testleri yapar."],
      ["Fan ve elektrik sistemi", "Klima radyatörünü soğutan fan çalışmazsa sistem basıncı yükselir ve soğutma düşer. Fan motoru, röleler, sigortalar ve sıcaklık sensörleri klima performansını etkiler. Özellikle trafikte beklerken soğutma zayıflıyorsa fan sorunu şüphesi doğar. Klima düğmesi çalışıp kompresör devreye girmiyorsa basınç anahtarı, sigorta ya da kumanda sorunu olabilir."],
      ["Radyatör (kondenser) ve tıkanıklık", "Klima radyatörü, motor soğutma radyatörünün önünde yer alır ve böcek, toz, yaprak gibi kirlerle tıkanabilir. Tıkalı kondenser ısıyı atamaz ve soğutma verimi düşer. Hasar görmüş ya da çürümüş kondenser kaçak yapar. Yüzeyin temizliği ve gözle kontrolü basit ama etkili bir adımdır. Taş darbesi sonucu oluşan hasarlar da kaçağa yol açabilir."],
      ["Kompresör arızası", "Kompresör sesli çalışıyor, kavrama devreye girmiyor ya da sürekli açılıp kapanıyorsa kompresör sorunu olabilir. İç aşınma sistemi kirletir ve ağır durumlarda kompresör kilitlenerek kayışı koparabilir. Kompresör arızası belirlendiğinde sistem temizliği ve kurutucu değişimi de yapılmalıdır. Kompresör, sistemin en pahalı parçalarından biridir; bu nedenle teşhis dikkatli konmalıdır."],
      ["Polen filtresi ve kabin akışı", "Soğutma yeterli olsa bile kabine giden hava zayıfsa polen filtresi tıkalı ya da fan motoru zayıf olabilir. Evaporatörde bakteri ya da küf oluşumu kötü kokuya ve akış azalmasına yol açar. Filtre değişimi basit ve ucuz bir adımdır; klima performansı sorunlarında ilk kontrol edilecek noktalardandır. Sistem temizliği de periyodik olarak yapılabilir."],
      ["Serviste yapılan kontroller", "Usta, klima gaz basıncını ölçer, kaçak testi yapar, kompresör kavramasını ve fanı kontrol eder, kondenser yüzeyini inceler ve kabin çıkış sıcaklığını ölçer. Gerekirse sistem vakumlanır ve gaz yenilenir. Teşhis sonucunu sizinle paylaşmasını isteyin. Gereksiz parça değişimini önlemek için ölçüm değerlerini öğrenin ve işlem sonrasında garanti belgesi alın."],
    ],
    faq: [
      ["Klima soğutmuyorsa yalnızca gaz mı eksiktir?", "Gaz eksikliği yaygın bir nedendir ama fan, kompresör, kondenser ve filtre sorunları da aynı belirtiyi verir."],
      ["Klima gazı yenilemek kalıcı çözüm müdür?", "Kaçak varsa geçici olur; kaçağın bulunup giderilmesi gerekir."],
    ],
  },
  B43: {
    kw: "motor yağı",
    meta: "Motor yağı seçiminde viskozite ve üretici onayı nasıl okunur? Viskozite sınıfı, onay kodları ve kullanım kılavuzuna göre doğru yağ seçimi.",
    intro:
      "Motor yağı seçimi, motorun ömrünü ve performansını doğrudan etkiler; ancak ambalajdaki kodlar çoğu kullanıcıya karmaşık gelir. İki temel ölçüt viskozite sınıfı ve üretici onayıdır. Bu yazıda bu iki kavramı, kullanım kılavuzundan bilginin nasıl alınacağını ve ambalajın nasıl okunacağını anlatıyoruz.",
    sections: [
      ["Motor yağı ne yapar?", "Motor yağı, hareketli parçalar arasındaki sürtünmeyi azaltır, ısıyı taşır, parçaları korozyondan korur ve yanma artıklarını taşıyarak motoru temiz tutar. Yağ zamanla ısı ve kirlenme nedeniyle özelliklerini yitirir; bu yüzden düzenli değiştirilmelidir. Yanlış tip ya da kalitede yağ kullanmak aşınmayı artırır ve motor ömrünü kısaltır. Bu nedenle yağ seçimi tahmine değil üreticinin gereksinimine dayanmalıdır."],
      ["Viskozite sınıfı nedir?", "Viskozite, yağın akışkanlık özelliğidir ve 0W-20, 5W-30 gibi kodlarla gösterilir. W harfinden önceki sayı yağın soğukta akışkanlığını, sonraki sayı ise sıcakta koruma özelliğini ifade eder. Soğukta akıcı olan yağ, motor çalıştırıldığında hızla parçalara ulaşır. Sıcakta yeterince koyu kalan yağ, ince film oluşturarak korur. Aracınız için uygun viskozite üretici tarafından belirlenir; bu değeri değiştirmek motor aşınmasını etkileyebilir."],
      ["Üretici onayı ve şartname", "Araç üreticileri, motor yağının karşılaması gereken şartnameleri belirler ve ürün ambalajında bu onay kodları yer alır. Yağın yalnızca viskozitesinin uyması yeterli değildir; üreticinin onay şartını da karşılaması gerekir. Özellikle dizel partikül filtreli, turbo takviyeli ya da yeni nesil motorlarda düşük küllü yağlar gerekebilir. Ambalajdaki onay kodlarını kullanım kılavuzundaki gereksinimle karşılaştırın."],
      ["Kullanım kılavuzundan bilgi nasıl alınır?", "Kullanım kılavuzunun bakım ya da teknik bilgiler bölümünde, motor için gerekli viskozite sınıfı, onay şartı ve yağ miktarı yazar. Kılavuzda motor seçeneğine göre farklı değerler olabilir; motorunuza uygun olanı seçin. Kılavuzunuz yoksa üreticinin web sitesinden ya da yetkili servisten şasi numarası ile öğrenin. Yağ kapağında ya da motor bölmesindeki etikette de bilgi bulunabilir."],
      ["Sentetik, yarı sentetik ve mineral yağ", "Mineral yağlar ham petrolden elde edilir, sentetik yağlar ise laboratuvar işlemleriyle üretilir ve daha kararlı özellik gösterir. Yarı sentetik ikisinin karışımıdır. Modern motorların çoğu tam sentetik yağ gerektirir. Hangi tipin uygun olduğu üretici şartnamesiyle belirlenir; kendi tercihinizle daha düşük kaliteye geçmek motor ömrünü etkileyebilir. Eski motorlarda ise üretici başka öneride bulunmuş olabilir."],
      ["Ambalajı nasıl okursunuz?", "Ambalajda viskozite sınıfını, onay kodlarını, sentetik ya da yarı sentetik olduğunu, hacmini ve üretim ya da parti bilgisini kontrol edin. Birden fazla onay kodu olabilir; aracınızın gereksinimi bunların içinde yer almalıdır. Marka, üretici bilgisi ve ambalajın orijinalliği de önemlidir. Güvenilir satıcıdan alın; şüpheli fiyat ve ambalaj kalitesi sahte ürün riskine işaret edebilir."],
      ["Yağ değişimi ve filtre", "Yağ değişimi, yağ filtresiyle birlikte yapılmalıdır. Yağ miktarı üretici değerine uygun olmalı, seviye çubukla kontrol edilmelidir. Fazla ya da az yağ motora zarar verir. Değişim aralığı aracın bakım planında belirtilir; ağır koşullarda daha sık değişim gerekebilir. Atık yağı çevreye dökmeyin, yetkili toplama noktalarına teslim edin."],
    ],
    faq: [
      ["Motor yağı seçerken önce neye bakılmalı?", "Üreticinin belirttiği viskozite sınıfı ve onay şartnamesine; bunlar kullanım kılavuzunda yazar."],
      ["Daha kaliteli yağ her araca uyar mı?", "Hayır; yağ, üreticinin şartnamesine uymalıdır. Yalnızca pahalı olması uygunluk anlamına gelmez."],
    ],
  },
  B44: {
    kw: "fren hidroliği",
    meta: "DOT 3, DOT 4 ve DOT 5.1 fren hidroliği seçimi nasıl yapılır? Üretici gereksinimi, standartların farkı ve karıştırma riskleri rehberi.",
    intro:
      "Fren hidroliği, fren pedalına uygulanan kuvveti tekerleklerdeki frenlere ileten sıvıdır ve doğru seçimi güvenlik açısından kritiktir. Piyasada DOT 3, DOT 4 ve DOT 5.1 gibi farklı standartlar bulunur. Bu yazıda üretici gereksinimini, standartlar arasındaki farkı ve uyumsuz ürünleri karıştırmamanın önemini anlatıyoruz.",
    sections: [
      ["Fren hidroliği ne yapar?", "Bu sıvı, pedala basıldığında fren merkezinden kalipere ve fren silindirlerine basıncı taşır. Sıkıştırılamayan bir sıvı olduğu için güçlü ve anlık frenleme sağlar. Hidrolik, frenleme sırasında yüksek sıcaklıklara maruz kalır; kaynama noktası düşükse buharlaşır ve pedal boşa gider. Ayrıca zamanla havadaki nemi emer ve kaynama noktası düşer; bu yüzden periyodik değişim gerekir."],
      ["DOT standartları nedir?", "DOT, hidrolik sıvılarının performans standartlarını belirten bir sınıflandırmadır. DOT 3, DOT 4 ve DOT 5.1 glikol bazlı sıvılardır ve genel olarak kaynama noktaları DOT 3'ten DOT 5.1'e doğru yükselir. Yüksek DOT sayısı her zaman daha iyi anlamına gelmez; aracın fren sistemi belirli bir standart için tasarlanmıştır. Aracınızın hangi standardı gerektirdiğini kullanım kılavuzundan ya da hidrolik deposu kapağından öğrenebilirsiniz."],
      ["Üretici gereksinimi", "Araç üreticisi, fren sistemi için gerekli minimum standardı belirler. Bu bilgi genellikle genleşme deposu kapağında yazar. Üreticinin belirttiği standart ya da daha yüksek performanslı glikol bazlı standart genellikle uyumludur; ancak bu uyumu doğrulamak için kılavuza bakın. Bazı sistemlerde, örneğin ABS ve ESP donanımlı araçlarda, özel şartnameler olabilir. Tahmine göre değil, yazılı gereksinime göre seçim yapın."],
      ["DOT 3, DOT 4 ve DOT 5.1 farkı", "DOT 3 en eski ve en düşük kaynama noktalı glikol sıvıdır. DOT 4 daha yüksek kaynama noktasına sahiptir ve modern araçlarda yaygın kullanılır. DOT 5.1 de glikol bazlıdır ve daha yüksek performans sunar. Üçü birbiriyle genellikle karışabilir ancak karışımın performansı en düşük olanın özelliğine yaklaşır. Aracın gerektirdiği standardın altına inmeyin; daha yüksek standart bazen tercih edilebilir ancak üretici onayını kontrol edin."],
      ["Silikon bazlı DOT 5 ile karıştırmayın", "DOT 5, silikon bazlıdır ve glikol bazlı DOT 3, DOT 4 ve DOT 5.1 ile karıştırılmamalıdır. Karışım, sistemde bozulmalara, conta zararlarına ve fren performansı kaybına yol açabilir. DOT 5 yalnızca üreticinin özellikle onayladığı sistemlerde kullanılır. Bu nedenle ürün ambalajını dikkatle okuyun ve emin değilseniz kullanmayın. Farklı tipte hidroliği karıştırmak ciddi güvenlik riski yaratır."],
      ["Nem ve değişim zamanı", "Glikol bazlı hidrolikler nemi emer ve zamanla kaynama noktaları düşer. Bu nedenle üreticiler belirli bir süre sonra hidroliğin yenilenmesini ister. Değişim aralığı bakım planında yazar. Hidrolik rengi koyulaşmışsa ya da pedal yumuşaksa kontrol ettirin. Açık bırakılan hidrolik şişesi nem çeker; kullanım sonrası kapağı sıkıca kapatın ve açılmış şişeyi uzun süre saklamayın."],
      ["Değişim ve hava alma", "Sıvı değişimi, sistemdeki eski sıvının tamamen tahliyesini ve havanın alınmasını gerektirir. Hava kalan sistem, pedalın boşa gitmesine neden olur. Değişim sırasında hidrolik deposu boşalmamalı, boyalı yüzeylere dökülmemelidir; hidrolik boyayı bozar. İşlemi fren sistemini bilen bir ustaya yaptırın ve ABS sistemi olan araçlarda özel hava alma prosedürlerinin gerekebileceğini unutmayın."],
    ],
    faq: [
      ["DOT 3 yerine DOT 4 kullanılabilir mi?", "Genellikle uyumludur ancak aracın üretici gereksinimini kullanım kılavuzundan doğrulayın."],
      ["Fren hidroliği ne zaman değişir?", "Üretici bakım planına göre değişir; nem alınca kaynama noktası düştüğü için periyodik değişim önemlidir."],
    ],
  },
  B45: {
    kw: "volkswagen golf",
    meta: "Volkswagen Golf bakım parçalarında nesil ve motor farkları nelerdir? Golf nesli, motor ve şanzıman kodu, filtre ve fren uyumu rehberi.",
    intro:
      "Volkswagen Golf, birçok nesil ve çok sayıda motor seçeneğiyle üretildiği için bakım parçalarının seçimi nesil ve motora göre yapılmalıdır. Aynı model adı altındaki farklı nesillerin filtre, fren ve süspansiyon parçaları birbirinden farklıdır. Bu yazıda Golf neslini, motor ve şanzıman kodunu, filtre ve fren uyumunu nasıl kontrol edeceğinizi anlatıyoruz.",
    sections: [
      ["Golf nesli neden önemlidir?", "Golf, yıllar içinde farklı platformlar ve tasarımlarla üretilmiştir; Golf 5, 6, 7 ve 8 gibi nesiller birbirinden belirgin mekanik farklar taşır. Bu farklar fren sistemi, alt takım, elektrik yapısı ve motor seçeneklerinde kendini gösterir. Aynı nesil içinde de makyaj dönemleri vardır. Aracınızın nesli ruhsattaki bilgilerle ve şasi numarasıyla doğrulanabilir. Nesil bilgisi olmadan parça aramak, uyumsuz ürün riskini artırır."],
      ["Motor seçenekleri", "Golf, benzinli ve dizel, farklı hacim ve güçte motorlarla sunulmuştur. Motor koduna göre yağ, hava ve yakıt filtreleri, buji ya da kızdırma parçaları, triger ya da zincir seti ve soğutma parçaları farklılaşır. Motor kodunu motor üzerindeki plakadan, ruhsattan ya da servis kayıtlarından öğrenin. Parça ararken bu kodu kullanmak, ürün listesini daraltır ve doğru parçaya ulaşmanızı kolaylaştırır."],
      ["Şanzıman kodu", "Golf modellerinde manuel, otomatik ve çift kavramalı şanzımanlar bulunur. Şanzıman tipine göre debriyaj seti, şanzıman yağı ve bazı sensörler değişir. Çift kavramalı şanzımanlarda yağ ve filtre bakımı özel prosedür gerektirir. Şanzıman kodunu şasi numarası ile doğrulayın. Yanlış şanzıman için alınan parçalar kullanılamaz ve ek maliyet yaratır."],
      ["Filtre uyumu", "Golf için yağ, hava, polen ve yakıt filtreleri nesil ve motora göre değişir. Hava filtresi kutusu ölçüsü, polen filtresi yuvası ve yağ filtresi tipi farklı olabilir. Ürün sayfasındaki araç uyumluluk listesini ve parça numarasını kontrol edin. Eski filtrenin üzerindeki numarayla karşılaştırma yapın. Bakım planını üreticinin kılavuzundan takip edin ve filtreleri birlikte değiştirmeyi düşünün."],
      ["Fren parçaları uyumu", "Golf'te ön ve arka fren diskleri ve balataları, motor gücüne ve donanıma göre farklı ölçülerde olabilir. Spor ya da güçlü versiyonlarda daha büyük fren sistemi bulunur. Balata aşınma sensörü soketi olan araçlarda sensörlü balata gerekir. Fren sistemi güvenlik açısından kritik olduğundan, şasi numarasıyla doğrulama yapmadan sipariş vermeyin. Disk ve balata birlikte değiştirilmelidir."],
      ["Süspansiyon ve alt takım", "Amortisör, salıncak, rotil ve burç gibi parçalar nesil ve donanıma göre değişir. Sportif süspansiyon ya da alçaltılmış donanım farklı parçalar gerektirebilir. Ön ve arka, sağ ve sol ayrımı da önemlidir. Ürün sayfasında uyumluluğu kontrol edin ve eski parçanın numarasıyla karşılaştırın. Alt takım parçalarını birlikte değerlendirmek, ek işçilik masrafını azaltır."],
      ["Doğrulama yöntemleri", "Şasi numarası, motor kodu ve OEM numarası doğrulamanın üç temel aracıdır. Parça siparişinden önce bu bilgileri satıcıyla paylaşın. Ürün sayfasındaki uyumluluk listesinde modelinizin ve motorunuzun bulunduğundan emin olun. Parçayı takmadan önce eski parçayla yan yana koyarak karşılaştırın. Montajı yetkin ustaya yaptırın ve bakım kayıtlarınızı tutun."],
    ],
    faq: [
      ["Volkswagen Golf parçaları tüm nesillerde aynı mı?", "Hayır; Golf 5, 6, 7 ve 8 gibi nesillerde parçaların büyük kısmı farklıdır."],
      ["Golf için hangi bilgiyle parça aranmalı?", "Nesil, üretim yılı, motor kodu, şanzıman tipi ve şasi numarası birlikte kullanılmalıdır."],
    ],
  },
  B46: {
    kw: "ford focus",
    meta: "Ford Focus için filtre ve fren parçası nasıl seçilir? Kasa ve motor, fren varyantı ve OEM eşleştirme konusunda ayrıntılı rehber.",
    intro:
      "Ford Focus için filtre ve fren parçası seçerken kasa, motor ve fren varyantı birlikte düşünülmelidir. Focus, farklı nesil ve motor seçenekleriyle sunulduğu için her parça her araca uymaz. Bu yazıda kasa ve motor farkını, fren sistemi varyantlarını ve OEM numarasıyla eşleştirmeyi anlatıyoruz.",
    sections: [
      ["Kasa ve nesil farkı", "Ford Focus, birkaç farklı nesilde ve hatchback, sedan, station wagon gibi kasa tiplerinde üretilmiştir. Her neslin platformu, fren sistemi ve motor seçenekleri farklıdır. Kasa tipi de bazı parçaları etkiler; arka fren ve alt takım parçaları kasaya göre değişebilir. Aracınızın neslini ve kasa tipini ruhsat ve şasi numarasıyla doğrulayın. Bu bilgiyle yapılan arama, uyumsuz parça riskini azaltır."],
      ["Motor seçenekleri ve filtre farkı", "Focus'ta benzinli ve dizel, farklı hacim ve güçte motorlar bulunur. Yağ filtresi, hava filtresi, yakıt filtresi ve polen filtresi motora ve üretim dönemine göre değişir. Dizel motorlarda yakıt filtresi su sensörlü olabilir. Motor kodunu ruhsattan, motor plakasından ya da servis kayıtlarından öğrenin. Parça ararken bu kodu kullanın."],
      ["Filtre seçiminde dikkat edilecekler", "Her filtre için ölçü, bağlantı yapısı ve parça numarası doğrulanmalıdır. Hava filtresi kutuya tam oturmalı, polen filtresi yuvasına uymalı, yağ filtresi motor yuvasına uygun olmalıdır. Ürün sayfasındaki araç uyumluluk listesini okuyun ve eski filtrenin numarasıyla karşılaştırın. Bakım planını kullanım kılavuzundan takip edin ve filtreleri periyoduna göre değiştirin."],
      ["Fren sistemi varyantları", "Focus'ta ön fren diskleri genellikle motora göre farklı çapta olabilir. Arka fren, bazı versiyonlarda disk, bazılarında kampana olabilir. El freni mekanizması da buna göre değişir. Balata ve disk seçerken ön ve arka akstaki fren tipini belirleyin. Aşınma sensörü olan araçlarda sensörlü balata gerekir. Fren sistemi güvenlik açısından önemlidir; tahmine dayalı seçim yapmayın."],
      ["Fren disk ve balata uyumu", "Disk çapı, kalınlığı, havalandırmalı ya da düz oluşu ve delik düzeni, balata şeklini ve ölçüsünü belirler. Disk ve balata aynı fren sistemine uygun olmalıdır. Disk değişirken balata da yenilenmelidir. Ürün sayfasında disk çapını ve uyumluluk listesini kontrol edin. Emin değilseniz eski diskin üzerindeki ölçüyü ve parça numarasını satıcıyla paylaşın."],
      ["OEM numarası ile eşleştirme", "Eski parçanın üzerindeki ya da üretici kataloğundaki OEM numarası, uyumlu ürünü bulmanın en güvenilir yoludur. Numarayı eksiksiz girin ve aynı numarayı karşılayan eşdeğer ürünleri karşılaştırın. Bazı numaraların birden fazla varyantı olabilir; ölçü ve bağlantı detaylarını doğrulayın. Şasi numarasıyla katalog sorgusu, motor ve donanım farkını da kapsar."],
      ["Montaj ve bakım önerileri", "Filtre değişimleri basit olabilir ancak yağ ve yakıt filtresi daha dikkat gerektirir. Fren işlemleri ise güvenlik açısından mutlaka yetkin bir ustaya yaptırılmalıdır. Montajdan sonra sızıntı, ses ve fren hissi kontrol edilmelidir. Yeni balata ve disk, ilk günlerde oturma sürecinden geçer; bu dönemde sert fren yapmaktan kaçının. Parça numaralarını bakım defterinize kaydedin."],
    ],
    faq: [
      ["Ford Focus filtreleri her motorda aynı mı?", "Hayır; motor koduna ve üretim dönemine göre değişir, parça numarasıyla doğrulayın."],
      ["Focus'un arka freni diskli mi kampanalı mı?", "Versiyona göre değişir; arka fren tipini kontrol etmeden balata ya da pabuç siparişi vermeyin."],
    ],
  },
  B47: {
    kw: "fiat doblo",
    meta: "Fiat Doblo parça seçiminde kasa ve motor uyumu nasıl kontrol edilir? Kasa ve üretim yılı, ticari gövde farkları ve OEM rehberi.",
    intro:
      "Fiat Doblo, hem yolcu hem ticari kullanımda yaygın olan ve farklı kasa, nesil ve motor seçenekleri sunan bir araçtır. Bu çeşitlilik, yedek parça seçimini dikkat gerektiren bir konu haline getirir. Bu yazıda kasa ve üretim yılını, ticari gövde farklarını ve motor ile OEM uyumunu nasıl kontrol edeceğinizi anlatıyoruz.",
    sections: [
      ["Kasa ve üretim yılı", "Doblo, farklı dönemlerde farklı tasarım ve platformlarla üretilmiştir ve nesiller arasında birçok parça değişir. Aynı nesil içinde makyaj dönemleri de vardır. Fren, alt takım, aydınlatma ve kaporta parçaları kasa ve üretim yılına göre farklılaşır. Aracınızın neslini ve üretim tarihini ruhsat ve şasi numarasıyla doğrulayın. Yalnızca model adına göre yapılan arama, uyumsuz parça riskini artırır."],
      ["Ticari gövde farkları", "Doblo, yolcu taşıyan kombi ve yük taşıyan cargo gibi farklı gövde tiplerinde sunulur. Bu gövdelerin arka süspansiyonu, fren sistemi, kapı yapısı ve aydınlatması farklı olabilir. Yük taşıma amaçlı versiyonlarda arka amortisör ve yaylar daha dayanıklı yapıdadır. Ürün sayfasında gövde tipinin ve kullanım amacının belirtilmesine dikkat edin. Yanlış gövde tipi için alınan parça uymayabilir."],
      ["Motor seçenekleri", "Doblo'da benzinli, dizel ve farklı hacimlerde motorlar bulunur. Motor koduna göre filtreler, triger ya da zincir seti, kayışlar, soğutma ve yakıt sistemi parçaları değişir. Motor kodunu ruhsattan, motor plakasından ya da servis kayıtlarından öğrenin. Dizel versiyonlarda yakıt filtresi su sensörlü olabilir. Parça ararken motor kodunu kullanın."],
      ["Bakım parçaları: filtre, yağ ve kayış", "Yağ, hava, polen ve yakıt filtreleri ile tahrik kayışı ve triger seti, periyodik bakımın temel kalemleridir. Ticari kullanımda, yani yoğun yükte ve sık dur-kalkta, bakım aralıkları kısalabilir. Bakım planını kullanım kılavuzundan takip edin ve çalışma koşullarınıza göre erken kontrol yapın. Parça numaralarını bakım defterinize kaydedin."],
      ["Fren ve süspansiyon parçaları", "Doblo'da fren balatası, disk, amortisör ve yaylar, gövde tipine ve yük kapasitesine göre değişir. Arka fren tipi ve arka süspansiyon yapısı yük taşıyan versiyonlarda farklı olabilir. Bu parçalar güvenlik açısından önemlidir; şasi numarasıyla doğrulama yapın. Yüklü kullanımda amortisör ve yayların aşınması hızlanabilir; düzenli kontrol edin."],
      ["Kaporta, aydınlatma ve kapı parçaları", "Far, stop, tampon, ayna ve kapı parçaları kasa dönemine ve gövde tipine göre değişir. Kayar kapılı versiyonlarda kapı ray ve mekanizma parçaları ayrıdır. Sağ ve sol, ön ve arka ayrımına dikkat edin. Ürün sayfasındaki uyumluluk listesini okuyun ve eski parçanın fotoğrafını satıcıyla paylaşın."],
      ["OEM ve şasi numarası ile doğrulama", "OEM numarası ve şasi numarası, uyumlu parçayı bulmanın en güvenilir yoludur. Parça siparişinden önce bu bilgileri satıcıyla paylaşın. Ürün sayfasındaki uyumluluk listesinde araç neslinizin, gövde tipinizin ve motorunuzun bulunduğundan emin olun. Parçayı takmadan önce eski parçayla karşılaştırın ve montajı yetkin ustaya yaptırın."],
    ],
    faq: [
      ["Fiat Doblo parçaları kombi ve cargo için aynı mı?", "Birçok parça farklıdır; arka süspansiyon, fren ve kapı yapısı gövde tipine göre değişebilir."],
      ["Fiat Doblo için hangi bilgiyle parça aranmalı?", "Nesil, üretim yılı, gövde tipi, motor kodu ve şasi numarası birlikte kullanılmalıdır."],
    ],
  },
  B48: {
    kw: "toyota corolla",
    metaTitle: "Toyota Corolla için nesil ve motora göre bakım parçası",
    meta: "Toyota Corolla için nesil ve motora göre bakım parçası seçimi: nesil ve motor, hibrit ve benzinli ayrımı, parça numarası ve doğrulama rehberi.",
    intro:
      "Toyota Corolla, uzun yıllardır farklı nesillerde ve benzinli ile hibrit motor seçenekleriyle üretilen bir modeldir. Bu nedenle bakım parçası seçimi nesil ve motora göre yapılmalıdır. Bu yazıda nesil ve motor farkını, hibrit ve benzinli ayrımını ve parça numarasıyla doğrulamayı anlatıyoruz.",
    sections: [
      ["Nesil farkı", "Corolla, birçok nesil boyunca farklı platformlar ve tasarımlarla üretilmiştir. Nesiller arasında fren, süspansiyon, motor ve elektrik donanımı değişir. Aynı nesil içinde makyaj dönemleri de vardır. Aracınızın neslini ve üretim yılını ruhsat ve şasi numarasıyla doğrulayın. Nesil bilgisi olmadan parça aramak, uyumsuz ürün riskini artırır."],
      ["Motor seçenekleri", "Corolla'da benzinli, dizel ve hibrit motor seçenekleri sunulmuştur ve motor koduna göre bakım parçaları farklılaşır. Yağ ve hava filtresi, buji, soğutma ve yakıt sistemi parçaları motora özeldir. Motor kodunu motor plakasından, ruhsattan ya da servis kayıtlarından öğrenin. Parça ararken bu kodu kullanın."],
      ["Hibrit ve benzinli ayrımı", "Hibrit Corolla'larda benzinli motorun yanında elektrik motoru ve yüksek voltaj batarya sistemi bulunur. Bu araçlarda fren sistemi enerji geri kazanımıyla çalışır; fren balataları daha az yıpranabilir ancak yine de kontrol edilmelidir. Soğutma sistemi, hem motoru hem de güç elektroniğini soğuttuğu için farklı yapıda olabilir. Hibrit sisteme ait işlemler uzmanlık gerektirir; bu araçlarda yüksek voltaj bileşenlerine kendi başınıza müdahale etmeyin."],
      ["Filtre ve yağ bakımı", "Yağ, hava, polen ve yakıt filtreleri nesil ve motora göre değişir. Hibrit motorlarda yağ ve filtre özellikleri, benzinli versiyonlardan farklı olabilir. Üreticinin belirttiği yağ viskozitesi ve onay şartını kullanım kılavuzundan öğrenin. Filtre seçiminde ürün sayfasındaki uyumluluğu ve parça numarasını doğrulayın."],
      ["Fren parçaları", "Corolla'da ön ve arka fren balataları ve diskleri, nesil ve donanıma göre değişir. Hibrit modellerde elektronik park freni ve enerji geri kazanım sistemi bulunabilir; bazı bakım işlemleri özel prosedür gerektirir. Balata ya da disk değişiminde bu prosedürlere uyulmalıdır. Aşınma sensörü ve soket yapısı da kontrol edilmelidir. Fren işlemlerini yetkin ustaya yaptırın."],
      ["Süspansiyon ve alt takım", "Amortisör, salıncak, rotil ve burç gibi parçalar nesil ve donanıma göre değişir. Ön ve arka, sağ ve sol ayrımına dikkat edin. Ürün sayfasında uyumluluğu kontrol edin ve eski parçanın numarasıyla karşılaştırın. Alt takım parçalarını birlikte değerlendirmek, ek işçilik masrafını azaltır. Değişim sonrası ön düzen ayarı yaptırın."],
      ["Parça numarası ve şasi numarası ile doğrulama", "Parça numarası ve şasi numarası, doğru ürünü bulmanın en güvenilir yoludur. Parça siparişinden önce bu bilgileri satıcıyla paylaşın. Ürün sayfasındaki uyumluluk listesinde nesil, motor ve hibrit ayrımının belirtildiğinden emin olun. Parçayı takmadan önce eski parçayla karşılaştırın ve montajı yetkin ustaya yaptırın. Bakım kayıtlarınızı düzenli tutun."],
    ],
    faq: [
      ["Toyota Corolla hibrit ile benzinli parçalar aynı mı?", "Birçok bakım parçası aynı olabilir ancak motor, soğutma ve fren sistemlerinde farklar vardır; şasi numarasıyla doğrulayın."],
      ["Hibrit Corolla'da yüksek voltaj sistemine müdahale edilir mi?", "Hayır; yüksek voltaj bileşenleri uzmanlık gerektirir ve kendi başınıza müdahale etmemelisiniz."],
    ],
  },
};
