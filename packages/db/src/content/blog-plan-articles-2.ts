import type { PlanArticle } from "./blog-plan-types";

/** B13–B24. Teknik değerler (kilometre, tork, basınç vb.) bilerek yazılmaz: araç kullanım kılavuzu ve üretici dokümanı esas alınır. */
export const PLAN_ARTICLES_2: Record<string, PlanArticle> = {
  B13: {
    kw: "amortisör arızası",
    meta: "Amortisör arızası hangi belirtilerle anlaşılır? Belirtiler, takoz ve yay ilişkisi ile ön ve arka aks uyumu hakkında bilmeniz gerekenler.",
    intro:
      "Amortisör arızası, yol tutuşunu, fren mesafesini ve sürüş konforunu doğrudan etkiler. Çoğu zaman yavaş ilerlediği için sürücü farkına varmadan alışır. Bu yazıda amortisörün ne işe yaradığını, arıza belirtilerini, takoz ve yayla ilişkisini ve ön ya da arka aks için doğru parçayı seçerken nelere dikkat etmeniz gerektiğini anlatıyoruz.",
    sections: [
      ["Amortisör ne işe yarar?", "Amortisör, yaydan gelen salınımı sönümleyerek tekerleğin yolla temasını korur. Yay yolun darbesini emer, amortisör ise yayın sürekli zıplamasını engeller. Amortisör zayıfladığında tekerlek yoldan kopabilir, araç virajda yalpalar ve fren sırasında burun dalışı artar. Bu yüzden amortisör yalnızca konfor değil, güvenlik parçasıdır. Lastik ömrünü ve diğer alt takım parçalarını da etkiler. Düzenli kontrol, hem güvenliği hem parça ömrünü korumanın en basit yoludur."],
      ["Amortisör arızası belirtileri", "Çukurdan geçtikten sonra aracın birkaç kez sallanması, virajlarda yatma, frenlemede aşırı öne dalma ve düz yolda direksiyonun savrulması tipik işaretlerdir. Lastiklerde düzensiz, kaşık şeklinde aşınma da amortisörün görevini yapmadığını gösterebilir. Amortisör gövdesinde yağ sızıntısı gözle görülebilir. Tümünde aynı anda belirti olmayabilir; belirtiler yavaş geliştiği için araç alışılmış davranışa dönüşür. Şüphe duyuyorsanız servis ortamında amortisör testi yaptırın."],
      ["Takoz ve yay ilişkisi", "Amortisör tek başına çalışmaz; üst yuvasındaki takoz, rulman, toz körüğü ve tampon lastiği ile birlikte bir sistem oluşturur. Takoz ya da rulman aşınmışsa direksiyon çevirirken ses gelebilir ve yeni amortisör bile erken yıpranabilir. Yay kırılmış ya da yorulmuşsa araç yüksekliği düşer. Bu parçaları amortisör değişimi sırasında birlikte kontrol ettirmek, ikinci işçiliği önler. Gerekirse takoz, rulman ve körük setini amortisörle birlikte yenileyin."],
      ["Ön ve arka aks uyumu", "Ön ve arka amortisörler farklıdır; ayrıca sağ ve sol taraf için ayrı kodlar olabilir. Bazı araçlarda yağlı, bazılarında gazlı amortisör kullanılır. Ürün sayfasında aksı ve tarafı kontrol edin. Aynı modelin spor ya da standart süspansiyon donanımı farklı parça gerektirebilir. Uyum için marka, model, üretim yılı ve mümkünse şasi numarasını kullanın. Yanlış parça, hem yol tutuşunu hem de montajı olumsuz etkiler."],
      ["Çift olarak değişim neden önerilir?", "Aynı akstaki iki amortisör birlikte yorulur. Birini yenileyip diğerini bırakmak, iki taraf arasında sönümleme farkı yaratır ve araç düzensiz davranır. Bu nedenle genellikle aynı akstaki iki amortisör birlikte değiştirilir. Değişimden sonra rot ve rotbaşı ayarı gerekebilir; bunun için usta ile görüşün. Lastik basıncını ve ön düzen ayarını da kontrol ettirmek faydalı olur."],
      ["Servis kontrolü nasıl yapılır?", "Usta, aracı kaldırıp amortisörlerin gövdesini sızıntı için inceler, takozları ve körükleri kontrol eder, süspansiyon testi yapabilir. Basit bir ön kontrol olarak aracın köşesine bastırıp bıraktığınızda en fazla bir ya da iki salınımla durması beklenir. Bu bilgi kesin teşhis yerine geçmez. Düzenli bakımda süspansiyon kontrolünü isteyin ve belirtileri ihmal etmeyin."],
      ["Parça seçerken kalite ve üretici", "Amortisör, güvenlik açısından önemli olduğu için üretici ve uyumluluk bilgisi belirgin ürünleri seçin. Parça numarasını eski amortisörle ya da OEM çapraz referansla doğrulayın. Çok düşük fiyatlı ve bilgisiz ürünlerden kaçının. Garanti ve iade koşullarını satın almadan önce okuyun. Montajı yetkin bir ustaya yaptırın ve değişim sonrası ilk sürüşlerde aracın davranışını gözlemleyin."],
    ],
    faq: [
      ["Amortisör arızası nasıl anlaşılır?", "Çukur sonrası sallanma, frenlemede öne dalma, virajda yatma ve düzensiz lastik aşınması başlıca belirtilerdir; kesin teşhis servis testiyle yapılır."],
      ["Amortisör tek mi çift mi değişir?", "Genellikle aynı akstaki iki amortisör birlikte değiştirilir; böylece sönümleme dengeli olur."],
    ],
  },
  B14: {
    kw: "yağ kaçağı",
    meta: "Yağ kaçağı ve yağ eksiltme arasındaki farklar nelerdir? Dış kaçak ile tüketimi ayırmak, kontrol noktaları ve parça siparişinden önce yapılacaklar.",
    intro:
      "Yağ kaçağı ile yağ eksiltme, çoğu zaman karıştırılan iki ayrı durumdur. Birinde yağ motorun dışına sızar, diğerinde yağ motor içinde yanar ya da başka yollarla kaybolur. Doğru teşhis, doğru parçanın seçilmesi için şarttır. Bu yazıda iki durumun farkını, kontrol noktalarını ve parça siparişinden önce yapılması gerekenleri anlatıyoruz.",
    sections: [
      ["Dış kaçak ne demektir?", "Dış kaçakta yağ, conta, keçe ya da bağlantı noktalarından dışarı sızar. Park yerindeki zeminde damlalar, motor üzerinde yağlı ve tozlu alanlar ve yanık yağ kokusu tipik göstergelerdir. Kaçak noktası bulunup ilgili conta ya da keçe değiştirilince sorun giderilir. Yağ seviyesinin düşmesi kaçakla ilgiliyse, sızıntı izi motorun altında ya da yan yüzeylerinde görülür. Kaçağın kaynağını belirlemeden parça sipariş etmek, yanlış parçaya yol açabilir."],
      ["Yağ eksiltme (tüketim) nedir?", "Yağ eksiltmede motor, yağı içeride tüketir. Yağ, piston segmanlarından, supap lastiklerinden ya da turbo sisteminden yanma odasına geçip yanabilir. Dışarıda iz görülmez ama çubuk seviyesi zamanla düşer ve egzozdan mavimsi duman çıkabilir. Bir miktar tüketim bazı motorlarda normal kabul edilir; kabul edilebilir miktar üreticiye göre değişir. Aşırı tüketim varsa segman, supap lastiği ya da turbo gibi parçalar incelenmelidir."],
      ["İkisini nasıl ayırt edersiniz?", "Zeminde yağ lekesi, motor çevresinde yağlı yüzeyler ve sızıntı kokusu varsa kaçak ihtimali yüksektir. Zemin temiz, ancak yağ çubuğundaki seviye düşüyorsa tüketim ihtimali artar. Her iki durum aynı anda da olabilir. Yağ seviyesini düz zeminde, motor soğukken ve sabit aralıklarla ölçüp not etmek, tüketim hızını anlamanızı sağlar. Kesin ayrım için servis kontrolü gerekir."],
      ["Kontrol noktaları", "Kaçak aramada sık bakılan yerler supap kapağı contası, yağ karteri contası ve tapası, yağ filtresi bağlantısı, krank ve eksantrik keçeleri, yağ basınç sensörü ve turbo yağ hatlarıdır. Motoru temizleyip kısa süre çalıştırarak yeni sızıntı izini aramak etkili bir yöntemdir. Tüketimde ise hava filtresi kutusunda yağ izi, egzoz dumanı ve bujilerdeki yağ lekeleri ipucu verir. Bu kontrolleri bir usta yapmalıdır."],
      ["Parça siparişinden önce ne yapmalısınız?", "Parça siparişinden önce kaçağın tam yerini ve kaynağını belirleyin. Supap kapağı contası ile karter contası farklı parçalardır; bir sızıntı yanlış tanıyla yanlış contayı aldırabilir. Motor kodunuzu ve şasi numaranızı hazır bulundurun. Conta setinin içeriğini, yani tek parça mı set mi olduğunu kontrol edin. Bağlantı cıvataları ve sızdırmazlık macunu gibi yardımcı malzemelerin gerekip gerekmediğini öğrenin."],
      ["Yağ kaçağını ihmal etmenin sonuçları", "Kaçak devam ederse yağ seviyesi düşer ve motor yetersiz yağlamayla çalışabilir; bu ciddi hasara yol açar. Sızan yağ kayış, hortum ve elektrik konnektörlerine bulaşarak onları da bozabilir. Egzoz manifoldu gibi sıcak yüzeylere damlayan yağ yangın riski taşır. Bu yüzden yağ seviyesini düzenli kontrol edin ve sızıntıyı erken gidermek için servise başvurun."],
      ["Yağ seviyesi nasıl doğru ölçülür?", "Aracı düz zeminde park edin, motoru kapatıp birkaç dakika bekleyin ve çubuğu çıkarıp silin, tekrar yerine takıp çıkararak seviyeyi okuyun. Seviye minimum ve maksimum işaretleri arasında olmalıdır. Aşırı yağ doldurmak da zararlıdır. Uzun yolculuk öncesi ve düzenli aralıklarla kontrol alışkanlığı edinin."],
    ],
    faq: [
      ["Yağ kaçağı ile yağ eksiltme aynı şey mi?", "Hayır. Kaçakta yağ dışarı sızar; eksiltmede yağ motor içinde yanar ya da başka yollarla tüketilir."],
      ["Her motor yağ yakar mı?", "Bazı motorlarda belirli bir miktar tüketim normaldir; kabul edilebilir miktar üreticiye göre değişir."],
    ],
  },
  B15: {
    kw: "ateşleme bobini",
    meta: "Ateşleme bobini ve buji arızası nasıl ayırt edilir? Ortak belirtiler, arıza kodlarının sınırı ve motor koduna göre seçim için rehber.",
    intro:
      "Ateşleme bobini ve buji, motorun ateşleme sisteminin iki temel elemanıdır ve arızaları benzer belirtiler verir. Motor tekliyor, rölantide titriyor ya da güç kaybediyorsa sorun bobinden de bujiden de kaynaklanabilir. Bu yazıda ortak belirtileri, arıza kodlarının sınırlarını ve motor koduna göre doğru parçayı seçmeyi anlatıyoruz.",
    sections: [
      ["Ateşleme sisteminde bobin ve buji ne yapar?", "Buji, yanma odasında kıvılcım çıkararak yakıt ve hava karışımını ateşler. Ateşleme bobini ise akülerin düşük voltajını bujinin kıvılcım üretebileceği yüksek voltaja dönüştürür. Modern motorlarda her silindir için ayrı bobin bulunabilir. İkisi birlikte çalıştığı için birindeki sorun motor performansını etkiler. Bu görevleri bilmek, belirtileri yorumlamayı kolaylaştırır."],
      ["Ortak belirtiler", "Motor tekleme, rölantide dalgalanma, çalıştırmada zorlanma, çekişte zayıflama, yakıt tüketiminde artış ve arıza ışığının yanması her iki parçada da görülebilir. Teklemenin hangi silindirde olduğu tespit edilirse, o silindirin bujisi ya da bobini şüpheli olur. Belirtilerin benzerliği nedeniyle yalnızca gözlemle kesin ayrım yapmak zordur. Doğru teşhis için silindir bazlı kontrol gerekir."],
      ["Arıza kodları ne söyler?", "Araç tanı cihazı, silindir bazında ateşleme hatası kodu verebilir. Bu kod, o silindirde bir ateşleme sorunu olduğunu belirtir ancak sorunun buji, bobin, enjektör ya da sıkıştırma kaynaklı olduğunu kesin söylemez. Kod bir başlangıç noktasıdır. Ardından o silindirdeki buji ve bobin kontrol edilir, gerekirse yer değiştirilerek test edilir. Kodun sınırını bilmek, gereksiz parça değişimini önler."],
      ["Teşhis yöntemi", "Usta, şüpheli silindirin bujisini çıkarıp elektrot aşınmasına, yağ ya da is kirine bakar. Bobini komşu silindire taşıyarak arızanın bobinle birlikte yer değiştirip değiştirmediğini test eder. Bu basit yöntem, bobin ve buji arasında ayrım yapmaya yardımcı olur. Teşhis sonrası yalnızca arızalı parçanın değil, çoğu zaman bujilerin takım halinde yenilenmesi önerilir."],
      ["Motor koduna göre seçim", "Buji ve bobin motor koduna ve üretim yılına göre değişir. Buji tipi, elektrot yapısı, vida boyu ve ısı değeri uygun olmalıdır. Bobinde ise soket yapısı, bağlantı ve tek bobin ya da bobin bloğu ayrımı önemlidir. Ürün sayfasındaki araç uyumluluğunu ve parça numarasını kontrol edin. Motor kodunu bilmeden alınan parça, uyumsuz çıkabilir."],
      ["Bakım önerileri", "Bujileri üretici planına göre değiştirmek bobin ömrünü de korur, çünkü aşınmış buji bobine fazladan yük bindirir. Bobin soketlerindeki nem ya da yağ, ateşleme sorunlarına yol açabilir; bu nedenle supap kapağı contası sızıntısı olan motorlarda bobin bölgesi de kontrol edilmelidir. Bakım sırasında bağlantıları temiz tutun."],
      ["Parça kalitesi", "Ateşleme parçaları, motor performansı ve emisyon için önemlidir. Tanınmış üreticilerin, motor koduna net uyumluluk belirten ürünlerini tercih edin. Takım halinde değişimde tüm bujilerin aynı marka ve tipte olması gerekir. Bobinde yalnızca ucuz fiyat odaklı seçim, erken arızaya yol açabilir. Montajdan sonra motorun düzgün çalıştığını ve arıza ışığının sönük kaldığını kontrol edin."],
    ],
    faq: [
      ["Bobin mi buji mi bozuk nasıl anlaşılır?", "Belirtiler benzerdir; silindir bazlı kontrol ve yer değiştirme testiyle ayrım yapılır."],
      ["Buji değişince bobin de değişir mi?", "Gerek yoktur; yalnızca arızalı bobin değişir. Ancak bujilerin düzenli yenilenmesi bobin ömrünü korur."],
    ],
  },
  B16: {
    kw: "fren balatası neden ses yapar",
    meta: "Fren balatası neden ses yapar? Sesin oluştuğu koşullar, disk ve montaj bileşenleri ile servis kontrolünde bakılması gerekenler.",
    intro:
      "Fren balatası neden ses yapar sorusunun tek cevabı yoktur. Ses, aşınma uyarısından montaj hatasına, nemden kirlenmeye kadar çeşitli nedenlerden kaynaklanabilir. Bazı sesler zararsızdır, bazıları ise acil kontrol gerektirir. Bu yazıda sesin oluştuğu koşulları, disk ve montaj parçalarının rolünü ve servis kontrolünde nelere bakıldığını anlatıyoruz.",
    sections: [
      ["Aşınma uyarısı sesi", "Birçok balata, kalınlık sınırına yaklaştığında metal bir uyarı parçasıyla diske temas eder ve tiz bir ses çıkarır. Bu ses, balatanın değişim zamanının yaklaştığını bildirir. Ses sürekli ve fren yapmasanız da gelebilir. Bu belirtiyi görmezden gelmek, balatanın tamamen bitmesine ve diskin zarar görmesine yol açar. Ses duyduğunuzda balata kalınlığını ölçtürün."],
      ["Nem ve kirlilik kaynaklı sesler", "Yağmurlu havada, sabahları ya da araç uzun süre bekledikten sonra balata ve disk yüzeyinde ince bir pas ya da nem oluşabilir. İlk frenlerde çıkan hafif ses ya da sürtünme, bu tabaka temizlendikten sonra kaybolur. Balata üzerine yapışmış toz, kum ya da yağ da ses yapabilir. Ses birkaç frenden sonra geçiyorsa genellikle zararsızdır. Geçmiyorsa kontrol ettirin."],
      ["Disk durumu", "Disk yüzeyinde derin oluklar, kenarda çıkıntı ya da düzensiz kalınlık varsa balata düzgün temas edemez ve titreşim ya da ses ortaya çıkar. Aşırı ısınmış, mavileşmiş disklerde de benzer sorunlar görülür. Disk durumu kalınlık ve yüzey kontrolüyle değerlendirilir. Gerekirse disk yenilenir. Yeni balata ile eski aşınmış disk bir arada kullanıldığında da ses sorunu yaşanabilir."],
      ["Montaj bileşenleri", "Balata klipsleri, kızaklar, titreşim önleyici levhalar ve kaliper yuvaları doğru takılmalı ve temiz olmalıdır. Eksik ya da yıpranmış klips balatanın yuvada gevşek hareket etmesine neden olur ve takırtı sesi çıkarır. Kızaklar kuru ya da paslıysa kaliper serbest hareket edemez. Balata değişiminde bu parçaların da yenilenmesi ve uygun yağlayıcıyla bakımının yapılması sesleri önler."],
      ["Balata kalitesi ve malzeme", "Farklı balata karışımları farklı ses özellikleri gösterebilir. Bazı sert karışımlar soğukken ses çıkarabilir. Düşük kaliteli balatalar da titreşim ve ses yapabilir. Aracınıza uygun, tanınmış üreticilerin ürünlerini tercih edin. Balata seçerken üretici onayını ve uyumluluk listesini kontrol edin."],
      ["Sesi ihmal etmeyin", "Her ses aynı ciddiyette değildir; ancak metalik sürtünme, sürekli tiz ses, pedal titreşimi ya da fren hissinde değişiklik acil kontrol gerektirir. Fren sistemi, güvenlik açısından kritik olduğundan şüphe duyduğunuzda aracı servise götürün. Erken müdahale, hem maliyeti hem riski azaltır."],
      ["Servis kontrolünde bakılanlar", "Usta balata ve disk kalınlığını, yüzey durumunu, kaliper hareketini, klips ve kızakları, fren hortumlarını ve hidrolik seviyesini kontrol eder. Gerekirse parçaları temizler, yağlar ya da yeniler. Kontrol sonucunu sizinle paylaşmasını isteyin. Sesin kaynağını belirlemeden parça değiştirmek, sorunu çözmeyebilir ve gereksiz masraf yaratır."],
    ],
    faq: [
      ["Fren balatası ses yapıyorsa tehlikeli midir?", "Her ses tehlikeli değildir; ancak metalik sürtünme ve sürekli tiz ses aşınma işaretidir ve kontrol gerektirir."],
      ["Yeni balata ses yapar mı?", "İlk günlerde oturma sürecinde hafif ses olabilir; sürmesi halinde montaj ve parça uyumu kontrol edilmelidir."],
    ],
  },
  B17: {
    kw: "triger seti",
    meta: "Triger seti alırken kutu içeriği nasıl kontrol edilir? Kayış ve gergiler, devirdaim dahil mi ve motor koduna göre set kapsamı rehberi.",
    intro:
      "Triger seti alırken kutu içeriğini kontrol etmek, doğru ve eksiksiz değişim için şarttır. Setlerin kapsamı üreticiye ve motora göre değişir; bazılarında yalnızca kayış ve gergi, bazılarında devirdaim pompası da bulunur. Bu yazıda set içeriğini nasıl okuyacağınızı, hangi parçaların birlikte değişmesi gerektiğini ve motor koduna göre set seçimini anlatıyoruz.",
    sections: [
      ["Triger setinde temel parçalar", "Kayışlı motorlarda temel set, triger kayışı ve gergi rulmanını içerir. Çoğu sette kılavuz makaralar da bulunur. Bu parçalar aynı sistemde birlikte çalışır ve aynı ömre sahiptir. Kayış yeni, gergi eski olursa gergi erken bozulabilir ve yeni kayışa zarar verebilir. Bu yüzden parçaların birlikte yenilenmesi önerilir."],
      ["Devirdaim pompası dahil mi?", "Bazı motorlarda devirdaim pompası triger kayışı tarafından tahrik edilir. Bu durumda pompa, kayışla aynı bölgede bulunur ve değişim sırasında yenilenmesi mantıklıdır. Bazı setlerde devirdaim pompası kutunun içinde gelir, bazılarında ayrıca alınır. Ürün açıklamasında 'devirdaim dahil' ibaresini arayın. Aracınızda pompa triger tarafından tahrik ediliyorsa, ayrı alım gerekiyorsa baştan planlayın."],
      ["Kayış ve gergilerin özellikleri", "Kayış seçerken diş sayısı, genişlik ve diş profili motora uygun olmalıdır. Gergi rulmanı ve kılavuz makaralar, doğru çap ve yatak yapısına sahip olmalıdır. Bu parçaların tek tek uyumunu motor koduyla doğrulayın. Seti üreticinin kataloğuyla karşılaştırmak, uyumsuzluk riskini azaltır."],
      ["Kutu içeriğini nasıl kontrol edersiniz?", "Ürünü teslim aldığınızda kutuyu açın ve içeriği ürün listesiyle karşılaştırın. Her parçanın üzerindeki numarayı kontrol edin ve eski parçalarla yan yana koyun. Kayışın dişlerini, rulmanların dönüşünü ve makaraların yüzeyini gözle inceleyin. Hasarlı ya da eksik parça varsa montaj yapmadan satıcıya bildirin. Parçalar takıldıktan sonra iade çoğu zaman mümkün olmaz."],
      ["Motor koduna göre set kapsamı", "Aynı model aracın farklı motorları farklı triger seti gerektirir. Motor kodunu şasi numarasıyla doğrulayın ve ürün sayfasındaki uyumluluk listesini kontrol edin. Üretim tarihine göre set değişebilir. Zincirli motorlarda ise zincir seti aranır; kayış seti bu araçlara uymaz. Yanlış set siparişini önlemek için motor kodunu satıcıyla paylaşın."],
      ["Ek parçalar ve yardımcı malzemeler", "Triger değişiminde bazen ek parçalar gerekir: vidalar, yağ keçeleri, kasnak cıvataları ve conta setleri. Bazı cıvatalar tek kullanımlık olabilir ve üretici yenilenmesini ister. Bu parçaların sette olup olmadığını ürün açıklamasından öğrenin. Ayrıca soğutma sıvısı ve gerekirse tahrik kayışı gibi yardımcı malzemelerin de planlanması gerekebilir."],
      ["Montajı yetkin ustaya yaptırın", "Triger, motorun en hassas montajlarından biridir. Yanlış ayar, motora ciddi hasar verebilir. Montajı bu işi bilen bir ustaya yaptırın ve üreticinin işaretleme ve sıkma değerlerine uyulmasını isteyin. Montaj sonrasında bakım defterine tarih ve kilometre kaydı yaptırın."],
    ],
    faq: [
      ["Triger setinde devirdaim bulunur mu?", "Ürüne göre değişir; ürün açıklamasındaki set içeriğine bakın."],
      ["Kayışla birlikte gergi de değişmeli mi?", "Evet, kayış ve gergi parçalarının birlikte yenilenmesi tavsiye edilir."],
    ],
  },
  B18: {
    kw: "hava filtresinin kirlendiği",
    meta: "Hava filtresinin kirlendiği nasıl anlaşılır? Görsel kontrol, kullanım koşulları ile bakım planı ve uyum konusunda pratik rehber.",
    intro:
      "Hava filtresinin kirlendiği her zaman kolayca anlaşılmaz; çoğu zaman performans düşüşü yavaş yavaş gelişir. Filtre motora giren havayı temizler, tıkandığında motor yeterli hava alamaz. Bu yazıda görsel kontrolü, kullanım koşullarının etkisini, bakım planını ve doğru filtre seçimi için uyum bilgisini anlatıyoruz.",
    sections: [
      ["Hava filtresi ne yapar?", "Hava filtresi, motora giden havadaki toz, polen, kum ve benzeri parçacıkları tutar. Temiz hava, yakıtla doğru oranda karışarak verimli yanma sağlar. Filtre kirlenirse hava akışı azalır ve motor yeterli hava alamaz. Bu da çekişte zayıflamaya ve yakıt tüketiminde artışa yol açabilir. Düzenli kontrol, motor sağlığı için basit bir önlemdir."],
      ["Görsel kontrol nasıl yapılır?", "Hava filtresi kutusunu açıp filtreyi çıkarın ve ışığa tutun. Işık filtre malzemesinden neredeyse hiç geçmiyorsa ya da yüzeyde yoğun toz, yaprak ve böcek birikimi varsa filtre kirlenmiştir. Kağıt filtreyi hafifçe çırpmak yüzeydeki iri tozu alır ama tıkanan gözenekleri açmaz; bu geçici bir çözümdür. Yağlı ya da ıslak filtre kesinlikle değiştirilmelidir."],
      ["Kirlenmenin belirtileri", "Çekişte zayıflama, ivmelenmede gecikme, yakıt tüketiminde artış, rölantide düzensizlik ve bazı araçlarda arıza ışığı kirli filtrenin göstergesi olabilir. Bu belirtiler başka nedenlerle de ortaya çıkabilir; bu yüzden filtre kontrolü teşhisin ilk ve en kolay adımıdır. Belirtiler kısa sürede artarsa servise başvurun."],
      ["Kullanım koşullarının etkisi", "Tozlu ve kumlu yollarda, inşaat bölgelerinde, tarım alanlarında ya da yoğun şehir trafiğinde filtre çok daha hızlı kirlenir. Bu koşullarda kullanılan araçlarda filtre değişim aralığı üretici planından daha kısa olabilir. Uzun süre park halinde bekleyen araçlarda da filtre kutusuna toz ve böcek girebilir. Kullanım şartlarınıza göre kontrol sıklığını artırın."],
      ["Bakım planı", "Üretici, hava filtresinin değişimi için belirli bir süre ya da kilometre öngörür. Bakım defterinizi ve kullanım kılavuzunu inceleyin. Genellikle yıllık bakımda filtre kontrol edilir ve gerekirse yenilenir. Planı takip etmek ve koşullara göre erkene almak, motor performansını korur. Bakım kayıtlarınızı tutmak, değişim zamanını unutmamanızı sağlar."],
      ["Doğru filtreyi seçmek", "Hava filtresi aracın modeline, motoruna ve üretim yılına göre değişir. Ürün sayfasındaki uyumluluk listesini ve ölçüleri kontrol edin. Filtre şekli, conta yapısı ve kenar ölçüleri kutuya tam oturmalıdır. Eski filtrenin parça numarasıyla ya da OEM numarasıyla karşılaştırma yapın. Tanınmış üreticilerin ürünleri tercih edilmelidir."],
      ["Montaj notları", "Filtreyi yerleştirmeden önce kutunun içini kuru bir bezle temizleyin ve yaprak, toz ve böcek kalıntılarını alın. Filtreyi doğru yönde ve contası tam oturacak şekilde takın. Kutunun kapak klipslerini tam kapatın; kaçak hava motora filtrelenmemiş hava girmesine yol açar. Sensör ve hava hortumu bağlantılarını kontrol edin."],
    ],
    faq: [
      ["Hava filtresi çırpılarak temizlenir mi?", "Çırpmak iri tozu alır ancak tıkanan gözenekleri açmaz; geçici bir çözümdür, kirli filtre değiştirilmelidir."],
      ["Hava filtresi ne sıklıkla değişir?", "Üretici planına ve kullanım koşullarına göre değişir; tozlu yollarda daha sık kontrol edin."],
    ],
  },
  B19: {
    kw: "yakıt filtresinde",
    meta: "Yakıt filtresinde sensörlü ve sensörsüz parça farkı nedir? Su sensörü, bağlantı ve ölçüler ile OEM numarası eşleştirme rehberi.",
    intro:
      "Yakıt filtresinde sensörlü ve sensörsüz parça farkı, özellikle dizel araçlarda karşımıza çıkar. Bazı filtrelerde yakıttaki suyu algılayan bir sensör bulunur, bazılarında bulunmaz. Yanlış seçim, uyarı ışığı ya da bağlantı sorunlarına yol açabilir. Bu yazıda su sensörünü, bağlantı ve ölçü farklarını ve OEM numarasıyla eşleştirmeyi anlatıyoruz.",
    sections: [
      ["Yakıt filtresi ne yapar?", "Yakıt filtresi, depodan gelen yakıttaki kir, pas ve su gibi yabancı maddeleri tutar. Enjeksiyon sistemleri çok hassas toleranslarla çalıştığından temiz yakıt büyük önem taşır. Tıkanan bir filtre yakıt akışını azaltır ve motorda güç kaybı, tekleme ya da çalışmama sorunları yaratabilir. Düzenli değişim, enjektör ve pompa ömrünü korur."],
      ["Su sensörü ne işe yarar?", "Dizel yakıt filtrelerinin bir kısmında, filtre gövdesinde biriken suyu algılayan bir sensör bulunur. Su seviyesi yükseldiğinde gösterge panelinde uyarı yanar. Su, enjeksiyon sistemine ciddi zarar verebildiği için bu uyarı önemlidir. Sensörlü filtrelerde altta bir tahliye vidası da bulunabilir ve biriken su buradan boşaltılır."],
      ["Sensörlü ve sensörsüz parça farkı", "Sensörlü filtre, sensör soketine sahiptir ve kablo bağlantısı gerektirir. Sensörsüz filtrede bu soket yoktur. Aracınız sensörlü filtreyle tasarlandıysa, sensörsüz filtre takarsanız uyarı sistemi çalışmaz ya da arıza ışığı yanabilir. Tersi durumda ise bağlantı fiziksel olarak uymayabilir. Bazı filtrelerde sensör ayrı satılır ve eski filtreden aktarılır."],
      ["Bağlantı ve ölçüler", "Filtrenin giriş ve çıkış bağlantı yapısı, çapı, boyu ve montaj şekli araca özeldir. Hızlı bağlantılı hortumlar, vidalı rakorlar ya da özel klipsler kullanılabilir. Bu detaylar uymuyorsa parça takılamaz. Ürün sayfasındaki teknik bilgileri ve görselleri eski filtreyle karşılaştırın. Filtrenin yönünü gösteren oklara dikkat edin."],
      ["OEM numarası ile eşleştirme", "Eski filtrenin üzerindeki numara ya da araç üreticisi kataloğundaki OEM numarası, sensörlü ya da sensörsüz doğru ürünü bulmanın en güvenilir yoludur. Aynı model için hem sensörlü hem sensörsüz sürümler bulunabilir. Numarayı eksiksiz girin. Şasi numarasıyla doğrulama yapmak, motor ve donanım farkını da kapsar."],
      ["Dizel ve benzinli farkı", "Benzinli araçlarda yakıt filtresi çoğu zaman yakıt pompasının bulunduğu depo içinde ya da hat üzerindedir ve su sensörü genellikle bulunmaz. Dizel araçlarda ise filtre kaput altında erişilebilir yerdedir ve sensör sıkça kullanılır. Bu nedenle filtre seçimi yakıt tipine ve motor kodu bilgisine göre yapılmalıdır."],
      ["Değişimde dikkat edilecekler", "Yakıt sistemi basınç altında çalışır; değişim öncesinde sistem boşaltılmalı ve yangın riskine karşı önlem alınmalıdır. Montajdan sonra dizel sistemlerde hava alma işlemi gerekebilir. Bu işlem yapılmazsa motor çalışmayabilir. Montajı yetkin bir ustaya yaptırın ve eski filtreyi uygun şekilde bertaraf edin."],
    ],
    faq: [
      ["Sensörsüz filtre sensörlü araca takılır mı?", "Takılabilse bile su uyarı sistemi çalışmaz ya da arıza ışığı yanabilir; aracın orijinal yapısına uygun filtre seçin."],
      ["Yakıt filtresi ne zaman değişir?", "Üretici bakım planına göre değişir; kullanım kılavuzunu ve servis kayıtlarını esas alın."],
    ],
  },
  B20: {
    kw: "devirdaim pompası",
    meta: "Devirdaim pompası ve triger seti neden birlikte incelenir? Tahrik sistemi farkları, sızıntı kontrolü ve üretici prosedürü hakkında rehber.",
    intro:
      "Devirdaim pompası, motorun soğutma sıvısını dolaştıran pompadır ve bazı motorlarda triger kayışı tarafından tahrik edilir. Bu yüzden triger bakımı sırasında devirdaim pompasının da incelenmesi önerilir. Bu yazıda tahrik sistemi farklarını, sızıntı kontrolünü ve üretici prosedürünün önemini anlatıyoruz.",
    sections: [
      ["Devirdaim pompası nasıl çalışır?", "Devirdaim pompası, motor bloğu ve radyatör arasında soğutma sıvısını dolaştırarak motorun çalışma sıcaklığını dengeler. Pompanın içinde bir çark, bir mil ve yataklar bulunur. Yatak aşınırsa ses yapar, conta yıpranırsa sıvı sızdırır. Pompa arızalandığında motor aşırı ısınabilir. Bu da ciddi hasara yol açabilir."],
      ["Tahrik sistemi farkları", "Bazı motorlarda pompa, triger kayışı tarafından döndürülür; bazılarında ise yardımcı tahrik kayışı ya da elektrik motoru kullanılır. Triger kayışıyla tahrik edilen pompalar, kayışla aynı bölgede bulunur. Bu yapıda pompaya erişmek için triger sisteminin açılması gerekir. Aracınızdaki sistemin hangisi olduğunu motor kodu ve şasi numarasıyla öğrenebilirsiniz."],
      ["Neden triger ile birlikte incelenir?", "Triger kayışına ulaşmak için yapılan sökme işlemi, pompaya da erişim sağlar. Pompa bu aşamada kolayca kontrol edilir ve değiştirilebilir. Sonradan yalnızca pompayı değiştirmek, tüm triger sisteminin yeniden sökülmesini gerektirir. Pompa ve kayış benzer ömre sahip olduğundan birlikte yenilemek ekonomiktir. Pompa ömrünün sonuna yaklaşmışsa kayışı da riske atabilir."],
      ["Sızıntı ve yatak kontrolü", "Pompanın gövdesinde, conta çevresinde ve gösterge deliğinde soğutma sıvısı izi sızıntı belirtisidir. Pompa kasnağını elle çevirdiğinizde boşluk, sertlik ya da ses varsa yatak aşınmıştır. Beyaz ya da renkli kuru izler, geçmişte sızıntı olduğunu gösterebilir. Bu kontroller servis ortamında yapılmalıdır."],
      ["Üretici prosedürü", "Triger ve devirdaim değişiminde üretici, sökme sırasını, işaretleme noktalarını ve sıkma değerlerini belirler. Bu prosedüre uyulmazsa motor senkronu bozulabilir. Bu yüzden işlemi bu prosedürü bilen bir ustaya yaptırın. Üreticinin önerdiği ek parçaların, örneğin conta ve cıvataların kullanıldığından emin olun."],
      ["Parça seçimi", "Devirdaim pompasını seçerken motor kodu, çark yapısı, flanş tipi ve conta uyumuna dikkat edin. Pompa çarkı metal ya da plastik olabilir; çark tipi aracınıza özgüdür. Ürün sayfasındaki uyumluluk listesini ve OEM numarasını kontrol edin. Triger setiyle birlikte satılan pompa varsa set içeriğini inceleyin."],
      ["Soğutma sıvısı ve sonrası", "Pompa değişiminde soğutma sıvısı boşaltılır; sıvının uygun standartta yenilenmesi ve sistemin havasının alınması gerekir. Hava kalan sistem aşırı ısınmaya neden olabilir. Montajdan sonra motor sıcaklığını ve sızıntıları izleyin. Seviyeyi soğuk motorda kontrol edin."],
    ],
    faq: [
      ["Devirdaim pompası triger ile aynı anda değişir mi?", "Pompa triger kayışıyla tahrik ediliyorsa genellikle birlikte değiştirilmesi önerilir."],
      ["Devirdaim pompası arızası nasıl anlaşılır?", "Soğutma sıvısı sızıntısı, pompa bölgesinden ses ve motorun aşırı ısınması belirtilerdir."],
    ],
  },
  B21: {
    kw: "rotil ve burç",
    meta: "Salıncak, rotil ve burç arasındaki farklar nelerdir? Parçaların görevleri, komple ve tekil parça farkı ile araç ve taraf uyumu rehberi.",
    intro:
      "Alt takımda salıncak, rotil ve burç sıkça karıştırılan parçalardır. Bu üçü birlikte tekerleğin hareketini ve süspansiyonun çalışmasını sağlar. Bu yazıda rotil ve burç ile salıncağın görevlerini, komple salıncak ile tekil parça farkını ve araç ile taraf uyumunu anlatıyoruz.",
    sections: [
      ["Salıncak nedir?", "Salıncak, tekerlek taşıyıcısını araç şasisine bağlayan, tekerleğin yukarı aşağı hareket etmesine izin veren kol parçasıdır. Genellikle ön süspansiyonun alt kısmında yer alır. Salıncak, yolun darbelerini taşır ve tekerleğin doğru konumda kalmasını sağlar. Eğilmiş ya da çatlamış bir salıncak, yol tutuşunu ve güvenliği ciddi şekilde etkiler."],
      ["Rotil nedir?", "Rotil, salıncağı tekerlek taşıyıcısına bağlayan küresel mafsaldır. Tekerleğin hem yukarı aşağı hem de direksiyonla yana dönmesine izin verir. Rotil aşındığında boşluk yapar; çukurlardan geçerken tak sesi gelir ve direksiyon hakimiyeti azalır. Rotilde gres ve toz körüğü bulunur; körük yırtılırsa kir ve su içeri girerek aşınmayı hızlandırır."],
      ["Burç nedir?", "Burç, salıncağın şasiye bağlandığı noktadaki kauçuk ya da poliüretan yataktır. Titreşimi ve gürültüyü emerken salıncağın kontrollü şekilde dönmesini sağlar. Burç aşındığında ya da yırtıldığında frenleme sırasında savrulma, tıkırtı ve düzensiz lastik aşınması görülebilir. Burçlar tek başına değiştirilebilir ya da salıncakla birlikte yenilenebilir."],
      ["Aralarındaki farklar", "Salıncak ana taşıyıcı kol, rotil tekerlek tarafındaki mafsal, burç ise şasi tarafındaki yataktır. Üçü de aşınabilir ancak farklı belirtiler verir. Rotil genelde çukurlarda tak sesi, burç ise frenleme ve ivmelenmede takırtı ya da savrulma yapar. Doğru teşhis, hangi parçanın değişeceğini belirler."],
      ["Komple salıncak mı tekil parça mı?", "Bazı araçlarda rotil ve burç salıncakla birlikte komple verilir ve ayrı değiştirilemez. Bazılarında ise rotil, burç ya da her ikisi ayrı satılır. Komple salıncak daha pahalı olabilir ama işçiliği kolaylaştırır. Tekil parça ekonomik görünebilir ancak burç basma gibi ek işçilik gerektirebilir. Aracınıza ve ustanıza göre karar verin."],
      ["Araç ve taraf uyumu", "Sağ ve sol salıncaklar farklıdır; ön ve arka da farklıdır. Ürün sayfasında tarafı ve aksı kontrol edin. Aynı modelin farklı donanım ve üretim yıllarında parça değişebilir. Uyum için marka, model, üretim yılı ve şasi numarasını kullanın. Parça numarasını eski parçayla karşılaştırın."],
      ["Değişim sonrası ön düzen", "Salıncak, rotil ya da burç değişiminden sonra ön düzen ve rot ayarı yaptırmak gerekir. Aksi halde lastikler düzensiz aşınabilir ve araç yönünü kaçırabilir. Cıvata sıkma işlemleri aracın yüklü konumunda yapılmalıdır; bunu usta bilir. Değişim sonrası ilk sürüşlerde aracın davranışını gözlemleyin."],
    ],
    faq: [
      ["Rotil ve burç aynı parça mı?", "Hayır. Rotil küresel mafsaldır; burç ise salıncağın şasiye bağlandığı kauçuk yataktır."],
      ["Salıncak değişince ön düzen gerekir mi?", "Evet, süspansiyon geometrisi değiştiği için ön düzen ayarı yaptırılmalıdır."],
    ],
  },
  B22: {
    kw: "termostat arızasında",
    meta: "Termostat arızasında hangi belirtiler görülebilir? Açık ve kapalı kalma durumları, hararet göstergesi ve diğer olası nedenler rehberi.",
    intro:
      "Termostat arızasında motor sıcaklığı normalin dışına çıkabilir; ya çok geç ısınır ya da aşırı ısınır. Termostat, soğutma sıvısının akışını sıcaklığa göre düzenleyen küçük bir valftir. Bu yazıda açık ve kapalı kalma durumlarını, hararet göstergesindeki belirtileri ve diğer olası nedenleri anlatıyoruz.",
    sections: [
      ["Termostat ne yapar?", "Termostat, motor soğukken kapalı kalarak soğutma sıvısının radyatöre gitmesini engeller ve motorun hızla çalışma sıcaklığına ulaşmasını sağlar. Sıcaklık belli bir değere ulaşınca açılır ve sıvı radyatöre akar. Böylece motor ideal sıcaklıkta tutulur. Termostat arızalanırsa bu denge bozulur ve performans, yakıt tüketimi ve motor ömrü etkilenir."],
      ["Açık kalan termostat belirtileri", "Termostat açık kalırsa motor geç ısınır ya da hiç tam sıcaklığa ulaşamaz. Sıcaklık göstergesi düşük kalır, kalorifer yeterince ısıtmaz ve yakıt tüketimi artabilir. Özellikle kışın belirgin olur. Motor soğuk çalıştığı için aşınma da hızlanabilir. Bu durum motorun hemen zarar görmesine yol açmasa da uzun vadede sorun yaratır."],
      ["Kapalı kalan termostat belirtileri", "Termostat kapalı kalırsa soğutma sıvısı radyatöre gidemez ve motor aşırı ısınır. Sıcaklık göstergesi hızla yükselir, ikaz ışığı yanar, radyatör hortumlarından biri sıcak diğeri soğuk kalabilir. Bu durum ciddidir; motoru çalıştırmaya devam etmek, conta ve silindir kapağı hasarına yol açabilir. Aşırı ısınma belirtisi görürseniz aracı güvenli yerde durdurun."],
      ["Hararet göstergesi ne söyler?", "Normal çalışma sıcaklığında ibre sabit ve ortada durur. İbre sürekli düşük kalıyorsa açık kalan termostat, aniden yükselip düşüyorsa takılıp açılan termostat ihtimali vardır. Bu belirtiler başka sorunlardan da olabilir. Göstergenin yanlış göstermesi ihtimaline karşı tanı cihazıyla gerçek sıcaklık değeri de kontrol edilebilir."],
      ["Diğer olası nedenler", "Yüksek sıcaklık yalnızca termostattan kaynaklanmaz; soğutma sıvısı eksikliği, devirdaim pompası arızası, radyatör tıkanması, fan arızası ya da hava kalması aynı belirtileri verebilir. Bu nedenle teşhis sistemin bütünü kontrol edilerek konulmalıdır. Rastgele termostat değiştirmek sorunu çözmeyebilir."],
      ["Parça seçimi", "Termostat, açılma sıcaklığına, gövde yapısına ve conta tipine göre seçilir. Açılma sıcaklığı motora özeldir; farklı değerde bir termostat motor sıcaklığını bozabilir. Bazı araçlarda termostat gövdesiyle birlikte satılır. Ürün sayfasındaki araç uyumluluğunu ve OEM numarasını kontrol edin."],
      ["Değişim ve sonrası", "Termostat değişiminde soğutma sıvısı boşaltılır, yeni conta kullanılır ve sistemin havası alınır. Eski contayı tekrar kullanmayın. Değişimden sonra sıvı seviyesini ve sıcaklık göstergesini izleyin. Sızıntı olup olmadığını kontrol edin. İşlemi uzman bir ustaya yaptırmak güvenlidir."],
    ],
    faq: [
      ["Termostat açık kalırsa ne olur?", "Motor geç ısınır, kalorifer zayıf kalır ve yakıt tüketimi artabilir."],
      ["Termostat kapalı kalırsa ne olur?", "Motor aşırı ısınır; bu ciddi motor hasarına yol açabileceğinden araç hemen durdurulmalıdır."],
    ],
  },
  B23: {
    kw: "peugeot 208",
    meta: "Peugeot 208 parça seçiminde motor kodu ve üretim tarihi neden önemlidir? Motor varyantları, OEM ve şasi doğrulaması rehberi.",
    intro:
      "Peugeot 208 için yedek parça seçerken motor kodu ve üretim tarihi belirleyici bilgilerdir. Aynı model, farklı motor seçenekleri ve farklı üretim dönemleriyle sunulduğu için her parça her araca uymaz. Bu yazıda motor varyantlarını, üretim tarihinin önemini ve OEM ile şasi numarasıyla doğrulamayı anlatıyoruz.",
    sections: [
      ["Nesil farkı", "Peugeot 208, ilk ve ikinci nesil olarak farklı dönemlerde üretilmiştir ve bu nesillerin mekanik yapıları, elektronik donanımları ve birçok parçası farklıdır. Bu yüzden yalnızca model adına göre parça aramak yanıltıcıdır. Nesil bilgisini üretim yılı ve şasi numarasıyla doğrulayın. Aynı nesil içinde de makyaj ve donanım farkları olabilir."],
      ["Motor varyantları", "Aynı modelde benzinli ve dizel, farklı hacim ve güçte motorlar bulunabilir. Her motorun filtre, triger, buji, enjeksiyon ve soğutma parçaları farklı olabilir. Motor kodunu ruhsattan, motor üzerindeki plakadan ya da yetkili servisten öğrenin. Parça ararken bu kodu kullanmak, uyumsuzluk ihtimalini büyük ölçüde azaltır."],
      ["Üretim tarihi neden önemlidir?", "Üretici, üretim süreci içinde bazı parçaları değiştirebilir. Aynı yıl içinde bile erken ve geç üretim araçlar arasında parça farkı olabilir. Ruhsattaki ilk tescil tarihi gerçek üretim tarihinden farklı olabilir. Şasi numarası, üretim bilgisine ulaşmanın en güvenilir yoludur. Katalog sorgularında şasi numarasını kullanın."],
      ["OEM numarası ile doğrulama", "Parça üzerindeki ya da üretici kataloğundaki OEM numarası, doğru ürüne ulaşmanın en kesin yoludur. Numarayı eksiksiz girin ve aynı numaraya sahip eşdeğer ürünleri karşılaştırın. Ürün sayfasındaki uyumluluk listesinde modelinizin ve motorunuzun bulunup bulunmadığını kontrol edin."],
      ["Şasi numarası ile doğrulama", "Şasi numarası tüm bu bilgileri bir arada taşır: model, nesil, motor, şanzıman ve üretim dönemi. Parça siparişinden önce satıcıya şasi numaranızı iletmek en güvenli yoldur. Bu numarayı ruhsattan ve araç üzerindeki plakadan okuyabilirsiniz. Özellikle triger seti, fren, süspansiyon ve sensör parçalarında bu doğrulama önemlidir."],
      ["Sık değişen parçalar", "Bakım kapsamında yağ, hava, polen ve yakıt filtreleri, fren balataları, bujiler, silecekler ve aküler en sık değişen kalemlerdir. Her biri için motor ve donanıma uygun ürün seçin. Bakım planını araç kullanım kılavuzundan takip edin. Parça numaralarını bakım defterinize kaydedin."],
      ["Alışverişte dikkat edilecekler", "Ürün sayfasındaki araç uyumluluk listesini okuyun, parça numarasını doğrulayın ve güvenilir satıcıdan faturalı alışveriş yapın. Emin olmadığınız ayrıntıyı satın almadan önce sorun. Montajı yetkin bir ustaya yaptırın. Aldığınız parçayı takmadan önce eski parçayla karşılaştırmak, olası hataları yakalamanızı sağlar."],
    ],
    faq: [
      ["Peugeot 208 parçaları her motorda aynı mı?", "Hayır. Motor koduna ve üretim dönemine göre birçok parça değişir; şasi numarasıyla doğrulayın."],
      ["Peugeot 208 için şasi numarası neden gerekir?", "Nesil, motor ve üretim dönemi gibi bilgileri tek seferde doğrular."],
    ],
  },
  B24: {
    kw: "opel astra",
    meta: "Opel Astra için kasa koduna göre yedek parça seçimi nasıl yapılır? Kasa nesli, motor, şanzıman ve üretim aralığına dikkat edin.",
    intro:
      "Opel Astra, farklı kasa kodlarıyla ve çok sayıda motor seçeneğiyle sunulduğu için yedek parça seçimi kasa nesline göre yapılmalıdır. Aynı model adı altındaki farklı nesillerin parçaları büyük oranda birbirinden farklıdır. Bu yazıda kasa neslini, motor ve şanzıman farkını ve üretim aralığını nasıl kontrol edeceğinizi anlatıyoruz.",
    sections: [
      ["Kasa kodu nedir?", "Kasa kodu, aracın nesline verilen harf ya da kod adıdır. Astra için H, J ve K gibi kasa kodları sık kullanılır ve her biri farklı bir tasarım ve platforma işaret eder. Her kasa neslinde alt takım, fren, motor bağlantıları ve elektrik yapısı farklıdır. Bu nedenle kasa kodunu bilmeden alınan parça uyumsuz olabilir. Aracınızın kasa kodunu ve üretim yılını ruhsattan ve şasi numarasından doğrulayın."],
      ["Nesil içinde makyaj farkları", "Aynı kasa kodu içinde makyajlı ve makyajsız versiyonlar bulunabilir. Far, tampon, ayna ve iç donanım parçaları gibi birçok kalem makyajla birlikte değişir. Elektrik sistemleri ve sensörler de farklı olabilir. Bu yüzden yalnızca kasa koduna değil, üretim aralığına da bakın. Ürün sayfasında belirtilen yıl aralığını aracınızla karşılaştırın."],
      ["Motor ve şanzıman farkı", "Opel Astra farklı güçlerde benzinli ve dizel motorlarla, manuel ve otomatik şanzımanlarla sunulmuştur. Motor koduna göre filtre, triger, buji, enjeksiyon ve soğutma parçaları farklılaşır. Şanzıman tipine göre debriyaj ve şanzıman parçaları değişir. Motor ve şanzıman kodunu şasi numarasıyla doğrulamak en güvenilir yoldur."],
      ["Üretim aralığı", "Ürün uyumluluk listelerinde parçanın hangi üretim aralığına uygun olduğu belirtilir. Aracınızın üretim tarihi bu aralıkta değilse parça uymayabilir. Üretim tarihi ile ilk tescil tarihi farklı olabilir; şasi numarası bu konuda kesin bilgi verir. Aralıkların sınır bölgesinde, yani geçiş dönemi araçlarda, ek dikkat gerekir."],
      ["Fren ve alt takım parçaları", "Fren balatası, disk, salıncak, rotil ve amortisör gibi parçalar kasa koduna ve donanıma göre değişir. Daha güçlü motorlu versiyonlarda daha büyük fren ve farklı süspansiyon donanımı olabilir. Bu parçalar güvenlik açısından kritik olduğundan, uyum doğrulaması özellikle önemlidir. Tahmine dayalı seçim yapmayın."],
      ["Filtre ve bakım parçaları", "Yağ, hava, polen ve yakıt filtreleri motora ve kasaya göre değişir. Ürün sayfasında parça numarasını ve uyumluluğu kontrol edin. Eski filtredeki numarayla karşılaştırma yapın. Bakım planını araç kullanım kılavuzundan takip edin ve kayıt tutun."],
      ["Doğrulama yöntemleri", "Şasi numarası, OEM numarası ve motor kodu, doğrulamanın üç temel aracıdır. Parça siparişinden önce bu bilgileri satıcıyla paylaşın. Ürün sayfasındaki uyumluluk listesini okuyun. Parçayı takmadan önce eski parçayla yan yana koyarak karşılaştırın. Montajı yetkin bir ustaya yaptırın."],
    ],
    faq: [
      ["Opel Astra parçaları tüm kasa kodlarında aynı mı?", "Hayır. H, J ve K gibi kasa kodlarına göre parçaların büyük kısmı farklıdır."],
      ["Opel Astra için hangi bilgiyle parça aranmalı?", "Kasa kodu, üretim yılı, motor kodu ve şasi numarası birlikte kullanılmalıdır."],
    ],
  },
};
