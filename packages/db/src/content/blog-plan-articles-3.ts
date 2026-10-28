import type { PlanArticle } from "./blog-plan-types";

/** B25–B36. Teknik değerler (kilometre, tork, basınç vb.) bilerek yazılmaz: araç kullanım kılavuzu ve üretici dokümanı esas alınır. */
export const PLAN_ARTICLES_3: Record<string, PlanArticle> = {
  B25: {
    kw: "debriyaj seti",
    meta: "Volan ve debriyaj seti arasındaki ilişki nedir? Tek ve çift kütleli volan yapısı, set uyumu ve teknik kontrol hakkında rehber.",
    intro:
      "Volan ve debriyaj seti, motorun gücünün şanzımana aktarıldığı hatta birlikte çalışan iki parçadır. Birinin durumu diğerinin ömrünü doğrudan etkiler; bu yüzden debriyaj seti değişirken volanın da incelenmesi gerekir. Bu yazıda volanın görevini, tek ve çift kütleli yapıyı, set uyumunu ve teknik kontrol adımlarını anlatıyoruz.",
    sections: [
      ["Volan ne yapar?", "Volan, krank miline bağlı ağır bir diskdir. Motorun yanma darbelerini yumuşatarak dönüşü düzgünleştirir ve debriyaj balatasının sürtündüğü yüzeyi oluşturur. Ayrıca marş motorunun motoru çevirdiği dişli çemberi taşır. Volan yüzeyi aşınırsa ya da çatlarsa debriyaj tutuşu bozulur, titreşim ve ses ortaya çıkar. Bu nedenle volan, debriyaj sisteminin sessiz ama önemli bir parçasıdır ve her debriyaj değişiminde kontrol edilmelidir."],
      ["Tek kütleli volan yapısı", "Tek kütleli volan, tek parça dökme demirden yapılır ve basit bir yapıya sahiptir. Yüzeyi uygun toleransta ise talaşlı işlemle tekrar düzeltilebilir. Dayanıklıdır ve genellikle ekonomiktir. Titreşimi sönümleme işini motor ve şanzıman yatakları ile debriyaj balatasının yayları üstlenir. Bu yapıda volanın yüzey durumu, oluklar, çatlaklar ve ısı lekeleri açısından incelenir ve gerekirse yüzey düzeltilir ya da volan yenilenir."],
      ["Çift kütleli volan yapısı", "Çift kütleli volan, iki ayrı kütle ve aralarındaki yay ve yağlama sisteminden oluşur. Motor titreşimlerini şanzımana geçmeden sönümler, böylece sessiz ve konforlu çalışma sağlar. Bu yapı daha karmaşıktır ve yaylarda, yataklarda ya da iç yağlamada aşınma olabilir. Çift kütleli volanlar genellikle yüzey düzeltmeyle onarılamaz. Aşınma belirtileri arasında rölantide titreşim, kalkışta sarsıntı ve vites geçişlerinde tıkırtı sayılabilir. Bunlar servis ortamında test edilmelidir."],
      ["Debriyaj seti ile volanın etkileşimi", "Debriyaj balatası volanın yüzeyine sürtünerek hareketi iletir. Yüzeyi bozulmuş bir volan, yeni balatanın erken yıpranmasına ve kaymasına yol açar. Bu nedenle yeni debriyaj takıldığında volanın da uygun durumda olması gerekir. Tersi de doğrudur: aşınmış bir baskı ya da balata, volan yüzeyine zarar verebilir. İkisinin birlikte değerlendirilmesi, değişimin kalıcı olmasını sağlar. Setten tasarruf edip volanı atlamak, kısa sürede ikinci bir işçilik masrafı yaratabilir."],
      ["Set uyumu nasıl doğrulanır?", "Debriyaj seti aracın motoruna, şanzımanına ve volan tipine göre seçilir. Tek kütleli volanlı bir araç için hazırlanan set, çift kütleli volanlı sürüme uymaz. Diş sayısı, balata çapı ve baskı yapısı da değişir. Ürün sayfasındaki araç uyumluluğunu, motor kodunu ve şanzıman tipini kontrol edin. Aracınızda hangi volanın bulunduğunu şasi numarası ve parça numarasıyla doğrulayın. Bazı üreticiler volanı ve debriyajı birlikte set olarak sunar; bu kapsamı ürün açıklamasından okuyun."],
      ["Teknik kontrol adımları", "Usta volan yüzeyinde oluk, çatlak, mavi ısı lekesi ve kenar çıkıntısı olup olmadığına bakar. Volan yüzey düzgünlüğünü ve kalınlığını ölçer. Çift kütleli volanda dönme boşluğunu, yayların durumunu ve yatak sesini test eder. Marş dişli çemberinin dişlerindeki kırık ya da aşınmayı inceler. Bu kontroller, volanın yeniden kullanılıp kullanılamayacağına karar vermeyi sağlar. Ölçüm değerlerini usta ile paylaşmasını isteyin."],
      ["Parça seçimi ve montaj", "Volan, motorun dengesi için hassas üretilmiş bir parçadır. Güvenilir üreticilerin, araç uyumluluğu net belirtilmiş ürünlerini seçin. Montajda volan cıvataları üretici sıkma değerine göre sıkılmalı ve gerekiyorsa yeni cıvata kullanılmalıdır. Debriyaj sistemi ayarı ve hava alma işlemleri ustaca yapılmalıdır. Montaj sonrası ilk günlerde yeni debriyajı oturtmak için sakin sürüş yapın ve olağandışı sesleri servise bildirin."],
    ],
    faq: [
      ["Debriyaj seti değişince volan da değişir mi?", "Zorunlu değildir; volanın durumuna bağlıdır. Çift kütleli volanlar ve yüzeyi bozulmuş volanlar yenilenmelidir."],
      ["Çift kütleli volan tamir edilir mi?", "Çoğu zaman edilemez; aşınmışsa değiştirilmesi gerekir. Teşhis servis ortamında yapılmalıdır."],
    ],
  },
  B26: {
    kw: "teker rulmanı",
    meta: "Teker rulmanı ve porya arasındaki farklar nelerdir? Rulman ve porya grubu, ABS halkası ile aks ve taraf bilgisi hakkında rehber.",
    intro:
      "Teker rulmanı ve porya, tekerleğin dönmesini sağlayan ve birbirine yakın çalışan parçalardır. Kullanıcılar çoğu zaman bu iki terimi karıştırır. Doğru parçayı almak için aralarındaki farkı bilmek gerekir. Bu yazıda rulman ve porya grubunun yapısını, ABS halkasının rolünü ve aks ile taraf bilgisinin neden önemli olduğunu anlatıyoruz.",
    sections: [
      ["Teker rulmanı nedir?", "Teker rulmanı, tekerleğin aks üzerinde sürtünmeyi en aza indirerek dönmesini sağlayan yatak elemanıdır. Bilyalı ya da makaralı yapıda olabilir ve gres ile yağlanmış, kapalı bir ünite olarak üretilir. Rulman aşındığında tekerlek bölgesinden hızla artan bir uğultu ya da homurtu duyulur. Sürüş güvenliğini etkileyen bir parçadır; aşırı aşınan rulman tekerlek boşluğuna ve nadiren tekerleğin kilitlenmesine yol açabilir. Düzenli kontrol ve zamanında değişim önemlidir."],
      ["Porya nedir?", "Porya, tekerleğin bağlandığı göbek parçasıdır. Rulman bu göbeğin içinde ya da etrafında bulunur. Tekerlek cıvataları poryaya takılır ve tekerlek bu yapıyla aksa bağlanır. Bazı araçlarda rulman ve porya tek bir ünite olarak, yani komple porya olarak satılır; bazılarında ise ayrıdır. Bu ayrım, hangi parçayı sipariş etmeniz gerektiğini belirler. Ürün sayfasında 'rulmanlı porya' ya da 'rulman seti' ifadesine dikkat edin."],
      ["Rulman ve porya grubu: komple mi ayrı mı?", "Modern araçlarda genellikle rulman, porya ve bazen ABS sensör halkası tek bir ünite halinde bulunur. Bu üniteyi değiştirirken rulmanı ayrı pres ile çıkarmaya gerek kalmaz; montaj daha kolaydır. Eski tip tasarımlarda ise rulman ayrı satılır ve özel pres gerektirir. Aracınızın tasarımını bilmeden sipariş vermek, yanlış parçaya yol açar. Motor, üretim yılı ve şasi numarasıyla uyum doğrulaması yapın."],
      ["ABS halkası ve sensörü", "Birçok araçta rulman içinde ya da porya üzerinde ABS sensörünün okuduğu manyetik halka veya dişli halka bulunur. Bu halka tekerlek hızını elektronik sisteme iletir. Halka hasarlıysa ya da yanlış tipte seçildiyse ABS ve çekiş kontrol sistemi arıza verebilir. Bu nedenle ABS halkalı ya da halkasız seçimi önemlidir. Aracınızın ABS sensör tipini kontrol edin ve ürün sayfasındaki uyumluluğu doğrulayın."],
      ["Arıza belirtileri", "Hız arttıkça artan uğultu, virajda değişen ses, direksiyonda titreşim, tekerlekte boşluk ve ABS uyarı ışığı rulman ya da porya sorununun işaretleri olabilir. Sesin hangi tarafta olduğu, aracı virajda sağa ya da sola yönlendirerek anlaşılabilir; yük aktarımı sesi değiştirir. Kesin teşhis için araç kaldırılarak tekerleğin boşluğu ve dönüş sesi kontrol edilir. Belirtiyi ihmal etmek ciddi güvenlik riski yaratır."],
      ["Aks ve taraf bilgisi", "Ön ve arka aks için farklı rulman ve porya parçaları bulunur. Sağ ve sol taraf bazı araçlarda aynı, bazılarında ABS sensörü ya da yapısı nedeniyle farklı olabilir. Ürün sayfasında aksı ve tarafı kontrol edin. Aynı modelin farklı donanım seviyelerinde, örneğin disk ya da kampanalı fren, parça farklılaşır. Şasi numarasıyla doğrulama, bu ayrıntıları tek seferde karşılar."],
      ["Değişim ve montaj", "Rulman ve porya değişimi, aks somununun üretici değerine göre sıkılması ve gerekiyorsa yeni somun kullanılmasını gerektirir. Hatalı sıkma, rulmanın erken bozulmasına yol açar. Montaj, tekerlek bölgesinin temizliğini ve doğru aletlerle yapılmasını ister. İşlemi yetkin ustaya yaptırın, değişim sonrası ses ve boşluk kontrolü yapın. Parçaları güvenilir üreticilerden seçin ve parça numarasını eski parçayla doğrulayın."],
    ],
    faq: [
      ["Teker rulmanı bozulunca hangi ses gelir?", "Hız arttıkça artan uğultu ya da homurtu duyulur; virajda ses değişebilir."],
      ["Rulman ve porya aynı parça mı?", "Hayır; porya tekerleğin bağlandığı göbektir, rulman ise dönmeyi sağlayan yataktır. Bazı araçlarda tek ünite halinde satılır."],
    ],
  },
  B27: {
    kw: "v kayışından gelen ses",
    meta: "V kayışından gelen ses hangi parçalarla ilişkili olabilir? Kayış ve gergiler, ses koşulları, ölçü ve kanal sayısı hakkında rehber.",
    intro:
      "V kayışından gelen ses, motor bölmesinden çıkan en yaygın uyarılardan biridir. Ancak ses her zaman kayışın kendisinden kaynaklanmaz; gergi, kasnak ya da bağlı aksesuarlar da neden olabilir. Bu yazıda sesin koşullarını, ilişkili parçaları, kayış ölçüsü ve kanal sayısı seçimini anlatıyoruz.",
    sections: [
      ["V kayışı ne yapar?", "V kayışı, krank milinin hareketini alternatör, klima kompresörü, direksiyon pompası ve devirdaim pompası gibi yardımcı aksesuarlara iletir. Modern araçlarda genellikle tek bir kanallı kayış tüm aksesuarları sürer. Kayış, gergi ve kasnaklarla birlikte bir sistemdir. Bu sistemde bir parçanın aşınması, tüm tahrik zincirini etkiler. Kayış kopması alternatörün şarj etmemesine, direksiyonun ağırlaşmasına ve motorun ısınmasına yol açabilir."],
      ["Ses hangi koşullarda gelir?", "Soğuk çalıştırmada kısa süreli ıslık ya da cıyaklama, kayışın nem ya da sertleşmesine bağlı olabilir. Direksiyonu sonuna kadar çevirirken, klima açıldığında ya da yüksek elektrik yükünde gelen ses, ilgili aksesuarın kayışı zorladığını gösterir. Sürekli ve motor devriyle değişen ses, gergi ya da kasnak yatağı sorununu düşündürür. Sesin ne zaman ve hangi devirde geldiğini not etmek, teşhisi hızlandırır."],
      ["Kayışın kendisinden kaynaklanan sesler", "Kayış zamanla sertleşir, çatlar ve yüzeyi parlaklaşır; bu durumda kasnaklarda kayarak ses çıkarır. Dişlerde kopma, kenarlarda yıpranma ve çatlaklar gözle görülebilir. Gevşek kayış da cıyaklar. Kayış gerginliği otomatik gergiyle sağlanıyorsa, gergi yayı zayıflamış olabilir. Kayış üzerine sprey sıkmak sesi geçici keser ama sorunu çözmez; aşınmış kayış değiştirilmelidir."],
      ["Gergi ve kılavuz makaralar", "Otomatik gergi ve kılavuz makaralar, kayışın doğru gerginlikte ve hizada kalmasını sağlar. Bu parçaların rulmanları aşındığında uğultu, gıcırtı ya da tıkırtı duyulur. Gergi yayı yorulduğunda kayış titrer. Kayış değişirken gergi ve makaraların durumunu kontrol ettirmek, yeni kayışın erken yıpranmasını önler. Çoğu zaman kayışla birlikte gergi seti yenilemek en doğru çözümdür."],
      ["Aksesuar kaynaklı sesler", "Alternatör, klima kompresörü, direksiyon pompası ve devirdaim pompasının rulmanları da ses çıkarabilir. Bu parçalar kayışı sürüyormuş gibi görünse de sesin asıl kaynağı rulman olabilir. Kayış çıkarılıp parçalar elle çevrilerek kontrol edilir. Sorunun kaynağını bulmadan kayışı değiştirmek, sesin devam etmesine neden olabilir. Teşhis için usta kontrolü şarttır."],
      ["Ölçü ve kanal sayısı", "V kayışı seçerken kayışın uzunluğu, genişliği ve kanal sayısı aracınıza uygun olmalıdır. Kanallı kayışlarda kanal sayısı ve profil tipi değişir. Klimalı ve klimasız araçlarda ya da farklı motorlarda kayış ölçüsü farklılaşabilir. Ürün sayfasındaki araç uyumluluğunu ve kayış kodunu kontrol edin. Eski kayışın üzerindeki kodla karşılaştırma yapmak en pratik doğrulama yöntemidir."],
      ["Montaj ve gerginlik ayarı", "Kayış montajında doğru yönlendirme şeması izlenmeli ve kayış tüm kasnak kanallarına tam oturmalıdır. Manuel gergili sistemlerde gerginlik üretici değerine göre ayarlanır; çok gevşek kayış kayar, çok gergin kayış rulmanlara zarar verir. Montajı yetkin ustaya yaptırın ve ilk çalıştırmada sesi kontrol edin. Kayış değişim tarihini bakım defterine kaydedin."],
    ],
    faq: [
      ["Kayış sesi her zaman kayıştan mı gelir?", "Hayır; gergi, kasnak ya da alternatör gibi aksesuar rulmanları da benzer ses çıkarabilir."],
      ["V kayışı seçerken ne gerekir?", "Uzunluk, genişlik ve kanal sayısı; aracınıza uygun kod için eski kayıştaki numarayı kullanın."],
    ],
  },
  B28: {
    kw: "radyatör kapağı",
    meta: "Radyatör kapağı su eksiltmeye neden olabilir mi? Basınç değeri, sızdırmazlık ve diğer olası kaçak ihtimallerini bu rehberde bulun.",
    intro:
      "Radyatör kapağı, soğutma sistemindeki basıncı kontrol eden küçük ama önemli bir parçadır. Yıpranmış bir kapak, soğutma sıvısının buharlaşmasına ya da dışarı atılmasına neden olabilir. Bu yazıda kapağın basınç değerini, sızdırmazlık işlevini ve su eksiltmenin diğer olası nedenlerini anlatıyoruz.",
    sections: [
      ["Radyatör kapağı ne yapar?", "Radyatör kapağı, soğutma sistemini kapatır ve belirli bir basınca kadar sıvıyı sistem içinde tutar. Basınç altındaki sıvının kaynama noktası yükselir, bu da motorun daha yüksek sıcaklıkta güvenle çalışmasını sağlar. Kapağın içinde bir basınç valfi ve bir vakum valfi bulunur. Basınç belirli değeri aşınca valf açılır ve fazlalık genleşme deposuna aktarılır; motor soğuyunca vakum valfi sıvıyı geri çeker. Bu işlev bozulursa sistem dengesi bozulur."],
      ["Basınç değeri neden önemlidir?", "Her araç için üretici belirli bir kapak basıncı öngörür ve kapağın üzerinde bu değer yazılıdır. Daha düşük basınçlı kapak, sıvının erken kaynamasına ve dışarı atılmasına yol açar. Daha yüksek basınçlı kapak ise hortumlara ve radyatöre aşırı yük bindirir. Bu yüzden kapak değeri aracınıza uygun olmalıdır. Ürün sayfasındaki basınç bilgisini ve uyumluluğu kontrol edin; tahmine dayalı seçim yapmayın."],
      ["Sızdırmazlık ve conta", "Kapağın contası zamanla sertleşir, çatlar ya da şeklini kaybeder. Sızdırmaz hale gelen kapak, basıncı tutamaz ve buhar kaçar. Bu durumda genleşme deposundaki seviye zamanla düşer, ancak dışarıda belirgin bir sızıntı görülmeyebilir. Kapağın yuvasındaki boyun yüzeyinin temizliği de önemlidir; kirli ya da hasarlı yüzey sızdırmazlığı bozar. Kapak contası gözle kontrol edilmelidir."],
      ["Su eksiltmenin belirtileri", "Genleşme deposundaki seviye düzenli düşüyor ancak zeminde sızıntı yoksa kapak, kısa süreli buhar kaçağı ya da sistemde içeriye sızan bir sorun olabilir. Motor sıcakken radyatör hortumunun aşırı sertleşmesi ya da şişmesi, kapak valfinin açmadığını gösterebilir. Kalorifer zayıflığı ve hararet de görülebilir. Bu belirtiler başka sorunlarla karışabilir; ayrım servis kontrolüyle yapılır."],
      ["Diğer olası kaçak ihtimalleri", "Soğutma sıvısı kaybı yalnızca kapaktan olmaz. Hortum bağlantıları, radyatör çatlağı, devirdaim pompası keçesi, termostat gövdesi, kalorifer radyatörü ve en ciddi ihtimal olarak silindir kapağı contası da sıvı kaybına yol açabilir. Egzozdan beyaz duman, yağda süt kıvamı ya da genleşme deposunda baloncuk, silindir kapağı contası şüphesi doğurur. Bu ihtimallerin ayrımı için sistem basınç testi yapılır."],
      ["Kapak değişimi ve güvenlik", "Radyatör kapağını motor sıcakken kesinlikle açmayın; basınç altındaki sıcak sıvı yanıklara neden olabilir. Motor tamamen soğuduktan sonra, kapağı bir bezle tutarak yavaşça açın. Yeni kapak takarken boyun yüzeyini temizleyin ve kapağın tam oturduğundan emin olun. Kapak değişiminden sonra seviyeyi ve sızıntıyı kontrol edin. Düşük maliyetli bir parça olduğu için şüphe durumunda değiştirmek makuldür."],
      ["Parça seçimi", "Kapağı seçerken basınç değeri, çap ve kilitleme yapısı aracınıza uygun olmalıdır. Radyatör ve genleşme deposu kapakları farklı olabilir; hangi yuvaya takılacağını belirleyin. Tanınmış üreticilerin, uyumluluk bilgisi net ürünlerini tercih edin. Parça numarasını eski kapakla ya da OEM numarasıyla karşılaştırın. Kapağı değiştirdiğinizde soğutma sıvısı seviyesini de kontrol edin."],
    ],
    faq: [
      ["Radyatör kapağı bozulursa su eksiltir mi?", "Evet, basıncı tutamayan kapak buhar kaçağına yol açıp sıvı seviyesinin düşmesine neden olabilir."],
      ["Radyatör kapağı sıcakken açılır mı?", "Hayır; basınçlı sıcak sıvı yanık riski taşır, motor soğuduktan sonra açın."],
    ],
  },
  B29: {
    kw: "kızdırma bujisi",
    meta: "Kızdırma bujisi ve ateşleme bujisi arasındaki farklar nelerdir? Dizel ve benzinli kullanım, görev, voltaj ve motor uyumu rehberi.",
    intro:
      "Kızdırma bujisi ve ateşleme bujisi, isim benzerliğine rağmen farklı motorlarda farklı görevler üstlenen parçalardır. Biri dizel motorların soğuk çalışmasına yardımcı olur, diğeri benzinli motorlarda yakıtı ateşler. Bu yazıda iki parçanın görevini, kullanım farkını, voltaj ve motor uyumunu anlatıyoruz.",
    sections: [
      ["Ateşleme bujisi nedir?", "Ateşleme bujisi, benzinli motorlarda silindir içinde kıvılcım üreterek yakıt ve hava karışımını yakar. Yanma her çevrimde buji kıvılcımıyla başlatılır. Buji elektrot aralığı, ısı değeri ve malzemesi motora özeldir. Aşınmış buji, tekleme, güç kaybı ve yakıt tüketimi artışına yol açar. Ateşleme bujisi, benzinli ve LPG'li motorlarda kullanılır ve düzenli değiştirilmesi gereken bir bakım parçasıdır."],
      ["Kızdırma bujisi nedir?", "Kızdırma bujisi, dizel motorlarda yanma odasını ya da ön yanma odasını ısıtan elektrikli bir ısıtıcıdır. Dizel yakıt sıkıştırma ile kendiliğinden tutuşur; ancak soğuk havada sıkıştırma ısısı yeterli olmayabilir. Kızdırma bujisi bu durumda ortamı ısıtarak motorun kolay çalışmasını sağlar. Kıvılcım üretmez; ısıtma görevi yapar. Gösterge panelindeki sarı sarmal ışığı, kızdırma sisteminin çalıştığını belirtir."],
      ["Görev ve çalışma farkı", "Ateşleme bujisi her çevrimde sürekli kıvılcım üretir; kızdırma bujisi ise yalnızca çalıştırma öncesinde ve soğuk çalışma sırasında devrededir. Biri yanmayı başlatır, diğeri yanmanın başlayabileceği ortamı hazırlar. Bu nedenle iki parça birbirinin yerine kullanılamaz. Bu parçanın arızası soğukta çalışma zorluğu, beyaz duman ve ilk anda sarsıntı olarak kendini gösterir."],
      ["Dizel ve benzinli kullanım", "Kızdırma parçası yalnızca dizel motorlarda, ateşleme bujisi benzinli motorlarda bulunur. Motorun yakıt tipi hangi bujinin gerektiğini belirler. Araç kullanım kılavuzunda ya da motor kodunda bu bilgi vardır. Sipariş verirken yakıt tipini ve motor kodunu netleştirin. İki tür buji birbirine uymaz, hem soket hem elektrot yapısı farklıdır."],
      ["Voltaj ve ısıtma özellikleri", "Bu parçalar, aracın elektrik sistemine uygun voltajda tasarlanır ve farklı ısınma hızlarına sahip olabilir. Hızlı ısınan seramik tipler ile klasik metal tipler vardır. Voltaj ya da bağlantı tipi uyumsuz bujiler çabuk yanar ya da yetersiz ısınır. Ürün sayfasındaki voltaj, uç boyu ve vida tipini araç uyumluluğu ile birlikte kontrol edin."],
      ["Motor uyumu ve parça seçimi", "Her iki buji tipi de motor koduna, silindir kafası yapısına ve üretim yılına göre değişir. Kızdırma bujisinde uç uzunluğu, ateşleme bujisinde elektrot aralığı ve ısı değeri kritik özelliklerdir. Yanlış parça, yanma sorunlarına ve motor hasarına yol açabilir. Parça numarasını eski bujiyle ve OEM numarasıyla doğrulayın. Takım halinde değişim önerilir."],
      ["Arıza belirtileri ve bakım", "Kızdırma elemanı arızasında soğukta zor çalışma, beyaz duman ve gösterge ışığının sürekli yanması görülebilir. Ateşleme bujisi arızasında ise tekleme ve güç kaybı yaşanır. Buji değişimi bakım planında yer alır; üreticinin aralığına uyun. Montajda buji sıkma değerine ve sökülürken kırılma riskine dikkat edilmelidir; özellikle kızdırma bujilerinde kırılma ciddi iş çıkarır. Bu nedenle işi bir usta yapmalıdır."],
    ],
    faq: [
      ["Kızdırma bujisi benzinli araçta kullanılır mı?", "Hayır; kızdırma bujisi dizel motorlara özgüdür, benzinli motorlarda ateşleme bujisi kullanılır."],
      ["Kızdırma bujisi arızası nasıl anlaşılır?", "Soğukta zor çalışma, beyaz duman ve gösterge ışığındaki anormallikler belirtidir."],
    ],
  },
  B30: {
    kw: "abs sensörü",
    meta: "ABS sensörü arızasında doğru teşhis neden önemlidir? Sensör ve kablo ayrımı, porya ilişkisi ve arıza kodunu doğrulama yöntemleri.",
    intro:
      "ABS sensörü arızası, gösterge panelinde uyarı ışığı yanmasına neden olur; ancak ışık her zaman sensörün bozuk olduğu anlamına gelmez. Sorun kablodan, poryadaki halkadan ya da kontrol ünitesinden kaynaklanabilir. Bu yazıda sensör ve kablo ayrımını, porya ilişkisini ve arıza kodunu nasıl doğrulayacağınızı anlatıyoruz.",
    sections: [
      ["ABS sensörü ne yapar?", "ABS sensörü, tekerleğin dönüş hızını ölçer ve bu bilgiyi ABS kontrol ünitesine gönderir. Ünite, bir tekerleğin diğerlerinden daha hızlı yavaşladığını fark ederse, o tekerleğin frenini kısa aralıklarla gevşeterek kilitlenmeyi önler. Sensör verisi çekiş kontrolü ve denge sistemi gibi diğer sistemler tarafından da kullanılır. Sensör arızalanırsa bu sistemler devre dışı kalabilir; normal fren çalışmaya devam eder ancak ABS koruması ortadan kalkar."],
      ["Arıza belirtileri", "Gösterge panelinde ABS ışığının yanması, çekiş kontrol ya da ESP ışığının yanması, hız göstergesinin düzensiz çalışması ve bazı araçlarda fren sırasında farklı pedal hissi görülebilir. Işık sürekli yanıyorsa sistem devre dışıdır. Aralıklı yanıyorsa kablo ya da konnektör sorunu olabilir. Işığı görmezden gelmeyin; fren sisteminin güvenliği için teşhis yaptırın."],
      ["Sensör mü kablo mu?", "ABS sensörünün kablosu tekerlek hareketiyle sürekli esner ve zamanla kopabilir ya da yalıtımı bozulabilir. Konnektörde nem ve oksidasyon da sinyal kaybına yol açar. Bu yüzden sensörü değiştirmeden önce kablo ve konnektör kontrol edilmelidir. Usta, sensör direncini ölçerek ve sinyali osiloskopla izleyerek sensör, kablo ve halka arasında ayrım yapar. Rastgele sensör değiştirmek sorunu çözmeyebilir."],
      ["Porya ve halka ilişkisi", "Sensör, poryadaki ya da rulmandaki ABS halkasını okur. Halka kirlenmişse, metal tozuyla dolmuşsa ya da hasarlıysa sensör doğru sinyal alamaz. Rulman aşınması sensör ile halka arasındaki boşluğu da değiştirir. Bu nedenle sinyal sorunu yaşanan tekerlekte rulman ve porya durumu da incelenmelidir. Sensör takılırken ucun temiz olması ve boşluğun doğru olması gerekir."],
      ["Arıza kodunu doğrulama", "Tanı cihazı, hangi tekerlek sensöründe sorun olduğunu gösteren arıza kodu verir. Bu kod, sorunun o devrede olduğunu belirtir ancak sensörün bozuk olduğunu kesin söylemez. Kod bir başlangıç noktasıdır; ardından sensör, kablo, konnektör ve halka kontrol edilir. Kodu silip yeniden test etmek ve canlı veri üzerinden tekerlek hızlarını karşılaştırmak, teşhisi netleştirir."],
      ["Doğru sensör seçimi", "ABS sensörleri aracın modeline, tekerleğin konumuna ve donanımına göre farklıdır. Ön ve arka, sağ ve sol ayrımı, kablo uzunluğu ve konnektör yapısı önemlidir. Ürün sayfasındaki uyumluluğu ve parça numarasını eski sensörle karşılaştırın. Pasif ve aktif sensör farkı da vardır; yanlış tip çalışmaz. Şasi numarasıyla doğrulama yapmak en güvenli yoldur."],
      ["Güvenlik ve sonraki adımlar", "ABS arızalıyken araç normal frenle çalışır ancak kaygan zeminde tekerlekler kilitlenebilir. Bu nedenle uyarıyı uzun süre ihmal etmeyin. Teşhis ve onarım sonrasında sistemin hata kodlarının silindiğinden ve ışığın söndüğünden emin olun. Parçayı güvenilir üreticiden seçin, montajı usta yapsın. Fren sistemi ile ilgili tüm işlemler güvenlik açısından dikkatle yapılmalıdır."],
    ],
    faq: [
      ["ABS ışığı yanıyorsa fren çalışmaz mı?", "Normal fren çalışır; ancak ABS koruması devre dışı kalır, bu yüzden arızanın giderilmesi önemlidir."],
      ["ABS sensörü arızası kodla kesinleşir mi?", "Kod hangi devrede sorun olduğunu gösterir; sensör, kablo ve halka kontrolüyle doğrulanmalıdır."],
    ],
  },
  B31: {
    kw: "turbo seçiminde",
    meta: "Turbo seçiminde OEM numarası ve yağlama hattı kontrolü neden önemlidir? Motor ve turbo kodu, parça eşleştirme ve çevre parçalar rehberi.",
    intro:
      "Turbo seçiminde OEM numarası ve yağlama hattı kontrolü, parçanın uzun ömürlü çalışması için belirleyicidir. Turbo, motorun en hassas ve pahalı parçalarından biridir; yanlış seçim ya da eksik hazırlık kısa sürede arıza yaratır. Bu yazıda motor ve turbo kodunu, parça eşleştirmeyi, yağlama hattını ve çevre parçaları anlatıyoruz.",
    sections: [
      ["Turbo nasıl çalışır?", "Turbo, egzoz gazı enerjisiyle dönen bir türbin ve bu türbine bağlı bir kompresörden oluşur. Kompresör motora giren havayı sıkıştırarak daha fazla oksijen sağlar ve güç artar. Turbo çok yüksek devirlerde ve yüksek sıcaklıklarda çalışır; mili yağ filmi üzerinde döner. Bu nedenle temiz ve yeterli yağlama hayati önem taşır. Turbo arızalarının büyük kısmı yağlama sorunlarından kaynaklanır."],
      ["Motor ve turbo kodu", "Aynı model aracın farklı motorlarında farklı turbo üniteleri kullanılır. Hatta aynı motorun farklı üretim dönemlerinde turbo değişebilir. Motor kodunu ve mevcut turbonun üzerindeki plakadaki numarayı bulun. Bu bilgiler, doğru parçaya ulaşmanın temelidir. Plakada okunmaz haldeyse şasi numarasıyla katalog sorgusu yapın. Yalnızca marka ve modele göre sipariş vermek, yanlış turbo riskini artırır."],
      ["OEM numarası ile eşleştirme", "Turbonun üzerindeki OEM ya da üretici numarası, uyumlu ürünleri bulmanın en güvenilir yoludur. Bu numarayı katalogda aratınca aynı özelliklere sahip yeni ya da yenilenmiş turbo seçenekleri listelenir. Numaranın harf ve rakamlarını eksiksiz girin. Ürün sayfasındaki araç uyumluluğunu da kontrol edin. Aynı OEM numarasının birden fazla varyantı olabilir; bağlantı noktası, aktüatör tipi ve flanş yapısı doğrulanmalıdır."],
      ["Yağlama hattı kontrolü", "Turbo arızasının en sık nedeni, tıkalı ya da hasarlı yağ besleme ve dönüş hatlarıdır. Besleme borusunda tortu ya da tıkanıklık varsa turbo yağsız kalır. Dönüş hattı tıkalıysa yağ turboda birikir ve sızıntıya yol açar. Yeni turbo takmadan önce bu hatların temizliği ve durumu kontrol edilmelidir. Yağ filtresi ve motor yağı da yenilenmeli, kullanım kılavuzundaki yağ standardına uyulmalıdır."],
      ["Çevre parçalar", "Turbo değişiminde intercooler hortumları, hava filtresi, egzoz bağlantıları, contalar, vakum hatları ve EGR sistemi de incelenmelidir. Eski turbodan kopan metal parçacıkları intercooler ve hortumlarda kalabilir; temizlenmezse yeni turboya zarar verir. Bu yüzden ilgili hatların temizlenmesi ya da gerekiyorsa değiştirilmesi gerekir. Conta ve cıvata setini de ayrıca planlayın."],
      ["Yeni turbo ve yenilenmiş turbo", "Yeni turbo, orijinal ya da eşdeğer üreticiden sıfır üretilmiş ünitedir. Yenilenmiş turbo ise kullanılmış çekirdeğin onarılıp balanslandığı ünitedir. Kalitesi yenilemeyi yapanın işçiliğine bağlıdır. Her iki durumda da üretici, garanti ve test bilgisine bakın. Çok düşük fiyatlı ve bilgisiz ürünlerden kaçının. Garanti şartlarında genellikle montaj koşulları da yer alır; bunları okuyun."],
      ["Montaj sonrası ilk çalıştırma", "Yeni turbo takıldıktan sonra motor çalıştırılmadan önce turbo yağ beslemesi doldurulmalı ve motor kısa süre rölantide bırakılmalıdır. Ani yüksek devirden kaçınılmalıdır. Sürüş sonrası motoru hemen kapatmak yerine kısa süre rölantide beklemek, turbonun soğumasını sağlar. Sızıntı ve ses kontrolü yapın. Montajı turbo işlerinde deneyimli bir ustaya yaptırın."],
    ],
    faq: [
      ["Turbo neden bozulur?", "Çoğunlukla yağlama sorunları, kirli yağ ve tıkalı yağ hatları nedeniyle; yabancı madde girişi de yaygın bir nedendir."],
      ["Turbo değişiminde başka ne yenilenir?", "Yağ, yağ filtresi, contalar ve gerekiyorsa yağ hatları ile intercooler hortumları temizlenmeli ya da yenilenmelidir."],
    ],
  },
  B32: {
    kw: "marş motoru",
    meta: "Marş motoru ve alternatörün görevleri nelerdir? Çalıştırma ve şarj, elektriksel kontroller, güç ve soket uyumu hakkında bilgi edinin.",
    intro:
      "Marş ve alternatör, aracın elektrik sisteminin iki temel parçasıdır ve çoğu zaman karıştırılır. Biri motoru çalıştırır, diğeri akünün şarj edilmesini sağlar. Bu yazıda marş motoru ve alternatörün görevlerini, elektriksel kontrolleri, güç ve soket uyumunu anlatıyoruz.",
    sections: [
      ["Marş motoru ne yapar?", "Marş motoru, kontak anahtarı çevrildiğinde akü gücüyle motoru ilk hareketlendiren elektrik motorudur. Küçük bir dişli, volan üzerindeki dişli çemberine kenetlenir ve motoru döndürür. Motor çalıştığında dişli geri çekilir. Bu motor yalnızca birkaç saniye çalışır ancak çok yüksek akım çeker. Arızalandığında anahtar çevrilince tık sesi, yavaş dönme ya da hiç tepki alınmaz."],
      ["Alternatör ne yapar?", "Alternatör, motor çalışırken kayış yardımıyla döner ve elektrik üretir. Bu elektrik, akünün şarj edilmesini ve araçtaki tüm elektrikli sistemlerin çalışmasını sağlar. Alternatörde bir regülatör bulunur ve gerilimi sabit tutar. Alternatör arızalıysa akü şarj olmaz; araç bir süre sonra durur. Gösterge panelindeki akü ikaz ışığı, şarj sisteminde sorun olduğunu bildirir."],
      ["İkisi arasındaki fark", "Marş aküden enerji çeker ve motoru çalıştırır; alternatör ise motor çalıştıktan sonra enerji üretir ve aküyü doldurur. Bu iki parçanın arızası farklı belirtiler verir. Marş sorununda motor hiç çalışmaz ya da zor çalışır; alternatör sorununda ise motor çalışır ancak akü boşalır ve elektrik sistemi zayıflar. Karışıklık, akünün boşalmasının her ikisine de benzemesinden kaynaklanır."],
      ["Elektriksel kontroller", "Önce akü gerilimini ve durumunu kontrol edin; zayıf akü, hem marş hem şarj belirtilerini taklit edebilir. Akü kutup başlarının temizliği ve bağlantı sıkılığı da önemlidir. Çalışan motorda akü gerilimi, alternatörün şarj ettiğini gösterecek şekilde yüksek olmalıdır. Usta bu ölçümleri yapar ve marş akımını, alternatör çıkışını ve regülatör durumunu test eder."],
      ["Güç ve soket uyumu", "Bu parçalar farklı güç değerlerinde üretilir. Alternatör amper değeri, aracın elektrik yüküne uygun olmalıdır; düşük güçlü alternatör yetersiz şarj verir. Marş motorunda da güç, dişli sayısı ve montaj yapısı motora göre değişir. Soket tipi ve bağlantı noktaları uymazsa parça takılamaz. Ürün sayfasındaki güç değerini, soket yapısını ve araç uyumluluğunu kontrol edin."],
      ["Belirtiler ve teşhis", "Marş basarken tık sesi, yavaş dönüş ya da hiç ses gelmemesi marş ya da akü sorununa işaret eder. Akü ikaz ışığı yanıyorsa, farlar zayıf yanıyorsa ya da motor çalışırken elektrikli aksamlar zayıflıyorsa alternatör şüphelidir. Akü sürekli boşalıyorsa, kaçak akım da kontrol edilmelidir. Kesin teşhis servis ortamında yapılır."],
      ["Parça seçimi ve değişim", "Marş ya da alternatör alırken motor kodunu, üretim yılını, klima durumunu ve güç değerini doğrulayın. Yenilenmiş parçalarda kalite ve garanti bilgisine dikkat edin. Parça numarasını eski parçayla ve OEM numarasıyla karşılaştırın. Montajdan önce akü bağlantısını kesin; elektrik kısa devresi yangına ya da elektronik hasara yol açabilir. İşi yetkin ustaya yaptırın."],
    ],
    faq: [
      ["Marş motoru ile alternatör aynı mı?", "Hayır; marş motoru motoru çalıştırır, alternatör ise motor çalışırken şarj eder ve elektrik üretir."],
      ["Akü sürekli boşalıyorsa sorun alternatör müdür?", "Olabilir; ancak akü ömrü, kaçak akım ve bağlantılar da kontrol edilmelidir."],
    ],
  },
  B33: {
    kw: "aks körüğü",
    meta: "Aks körüğü yırtıldığında hangi parçalar kontrol edilir? İç ve dış körük, gres ve mafsal durumu ile ölçü ve aks uyumu rehberi.",
    intro:
      "Aks körüğü, aks mafsalını koruyan ve gresi içinde tutan kauçuk bir kılıftır. Yırtıldığında gres dışarı akar ve mafsala kir ve su girer. Bu yazıda körük yırtıldığında hangi parçaların kontrol edilmesi gerektiğini, iç ve dış körük farkını, gres ve mafsal durumunu ve ölçü ile aks uyumunu anlatıyoruz.",
    sections: [
      ["Aks körüğü ne işe yarar?", "Aks körüğü, aks mafsalının üzerinde bulunan ve içindeki gresi tutan esnek bir kapaktır. Aynı zamanda dışarıdan gelen su, toz ve çamuru mafsaldan uzak tutar. Mafsal, tekerleğin hem dönmesine hem de süspansiyonla hareket etmesine izin verirken sürekli yağlı olmak zorundadır. Körük yırtılırsa gres dışarı sıçrar ve mafsal kısa sürede kuruyup aşınır. Bu nedenle körük sağlığı aks ömrünü belirler."],
      ["İç ve dış körük farkı", "Aksın tekerlek tarafında dış mafsal ve onun körüğü, şanzıman tarafında ise iç mafsal ve körüğü bulunur. Dış körük direksiyon çevrildiğinde daha fazla esner ve bu yüzden daha sık yırtılır. İç körük şanzıman tarafındadır ve sıcaklık etkisi daha fazladır. İki körüğün ölçüsü ve yapısı farklıdır; sipariş verirken hangisine ihtiyacınız olduğunu belirleyin. Ürün sayfasında iç ve dış ayrımı net yazılmalıdır."],
      ["Yırtılma belirtileri", "Tekerlek ve çevresinde sıçramış koyu renkli gres, körükte çatlak ya da yırtık, virajda tık tık sesi ve titreşim, aks körüğü sorununun belirtileridir. Gres sıçrayan bölgede kir birikir. Tık sesi, mafsalın zarar görmeye başladığını gösterebilir. Körüğü periyodik bakımlarda ve araç kaldırıldığında gözle kontrol ettirmek, sorunu erken yakalamanızı sağlar."],
      ["Gres ve mafsal durumu", "Körük yırtıldığında önemli olan, mafsalın ne kadar zarar gördüğüdür. Yırtık yeni oluşmuşsa ve gres içinde kir azsa mafsal temizlenip yeni gres ve körükle korunabilir. Uzun süre yırtık kalmışsa mafsal aşınmış, gres kirlenmiş olabilir; bu durumda komple aks ya da mafsal değişimi gerekir. Usta mafsalı sökerek bilyaları, yuvaları ve yüzeyleri kontrol eder. Karar bu kontrolün sonucuna göre verilir."],
      ["Körük mü mafsal mı komple aks mı?", "Seçenekler üçtür: yalnızca körük, körük ve mafsal seti ya da komple aks. Mafsal sağlamsa körük seti yeterli ve ekonomiktir. Mafsal hasarlıysa mafsalla birlikte körük değişir. Aksın bütününde sorun varsa komple aks gerekir. Hangisinin uygun olduğuna ustanız karar verir. Eksik parçayla bir daha servise gitmemek için seti baştan eksiksiz alın."],
      ["Ölçü ve aks uyumu", "Körüğün çapı, boyu, kelepçe yapısı ve diş sayısı aks mafsalına özeldir. Aynı modelin farklı motor ve şanzıman donanımlarında aks değişebilir. Ürün sayfasındaki araç uyumluluğunu kontrol edin, tarafı ve aksı belirtin. Eski körükle ölçü karşılaştırması yapın. Şasi numarasıyla doğrulama, farklı donanım ihtimalini de kapsar."],
      ["Montaj ve bakım", "Körük montajında mafsal temizlenmeli, uygun gres miktarı eklenmeli ve kelepçeler doğru sıkılmalıdır. Fazla ya da az gres, mafsala zarar verir. Montajdan sonra körüğün çatlaksız ve gergin olduğunu kontrol edin. Düzenli bakımlarda körükleri incelemek, yırtılmayı erken fark etmenizi sağlar. Bu işi yetkin bir ustaya yaptırın."],
    ],
    faq: [
      ["Aks körüğü yırtıksa araç sürülür mü?", "Kısa süre sürülebilir ancak gres kaybı mafsalı hızla aşındırır; en kısa sürede değiştirilmelidir."],
      ["Aks körüğü yırtılınca aks de değişir mi?", "Erken müdahalede yalnızca körük yeterli olabilir; mafsal aşınmışsa mafsal ya da komple aks gerekir."],
    ],
  },
  B34: {
    kw: "direksiyon kutusu",
    meta: "Direksiyon kutusu ve pompası arızalarında görülen belirtiler nelerdir? Elektrikli ve hidrolik sistem farkı, ortak belirtiler ve doğrulama rehberi.",
    intro:
      "Direksiyon kutusu ve direksiyon pompası arızalarında belirtiler birbirine benzer; bu yüzden doğru teşhis için sistemin türünü bilmek gerekir. Elektrikli ve hidrolik sistemlerin yapısı farklıdır ve arıza belirtileri de değişir. Bu yazıda sistem farkını, ortak belirtileri ve teşhis ile doğrulamanın önemini anlatıyoruz.",
    sections: [
      ["Direksiyon kutusu ne yapar?", "Direksiyon kutusu, direksiyon simidinin dönüş hareketini tekerleklerin yana dönme hareketine çevirir. Bir kremayer dişli sistemiyle çalışır ve rot kolları aracılığıyla tekerlekleri yönlendirir. Direksiyon kutusunun aşınması boşluğa, ses ve sızıntıya yol açar. Güvenlik açısından doğrudan sürüş kontrolünü ilgilendiren bir parçadır; arızası ciddiye alınmalıdır."],
      ["Hidrolik direksiyon sistemi", "Hidrolik sistemde direksiyon pompası, basınçlı yağı direksiyon kutusuna göndererek dönüşü kolaylaştırır. Pompa motordan kayışla tahrik edilir. Yağ seviyesi, hortumlar, kutudaki keçeler ve pompa kondisyonu sistem sağlığını belirler. Pompa arızasında direksiyon ağırlaşır, çalışırken uğultu duyulur. Kutuda keçe sızıntısı varsa yağ azalır ve sistem verimsizleşir. Yağ seviyesi düşükse önce sızıntı kaynağı aranmalıdır."],
      ["Elektrikli direksiyon sistemi", "Elektrikli sistemde pompa yoktur; bir elektrik motoru direksiyona destek verir. Bu motor kutuya ya da direksiyon kolonuna bağlı olabilir. Arızada gösterge panelinde direksiyon uyarı ışığı yanabilir, direksiyon ağırlaşabilir ya da destek kesilebilir. Bu sistemlerde elektronik kontrol ünitesi ve sensörler de arıza kaynağı olabilir. Teşhis tanı cihazı gerektirir."],
      ["Ortak belirtiler", "Direksiyonun ağırlaşması, dönerken ses ve uğultu, direksiyonda boşluk, tekerlekleri düz tutmada zorluk, titreşim ve sızıntı hem kutu hem pompa arızasında görülebilir. Bu benzerlik teşhisi güçleştirir. Belirtilerin hangi koşulda arttığı, örneğin soğukta mı sıcakta mı ya da park manevrasında mı olduğu, ustanın değerlendirmesine yardımcı olur. Notlarınızı servisle paylaşın."],
      ["Pompa mı kutu mu?", "Hidrolik sistemde yağ seviyesi, hortum basıncı ve pompa basıncı ölçülerek ayrım yapılır. Pompa yeterli basıncı üretiyor ancak direksiyon ağırsa kutu iç sızdırmazlığı sorunlu olabilir. Pompa basıncı düşükse pompa şüphelidir. Elektrikli sistemlerde tanı cihazı motor, sensör ve ünite arızalarını ayrıştırır. Rastgele parça değiştirmek yerine ölçüme dayalı karar verilmelidir."],
      ["Parça seçimi ve uyum", "Direksiyon kutusu ve pompası araç modeline, üretim yılına, hidrolik ya da elektrikli oluşuna ve sürüş tarafına göre değişir. Sağdan ve soldan direksiyonlu araçlarda parça farklıdır. Ürün sayfasındaki uyumluluğu, parça numarasını ve sistem tipini kontrol edin. Yenilenmiş parçalarda test ve garanti bilgisini inceleyin. Şasi numarasıyla doğrulama yapmak yanlış parça riskini azaltır."],
      ["Değişim sonrası işlemler", "Direksiyon kutusu ya da pompa değişiminden sonra sistemin havasının alınması, yağın doldurulması ve ön düzen ayarının yapılması gerekir. Elektrikli sistemlerde kalibrasyon ve adaptasyon işlemleri gerekebilir. Bu işlemler yapılmazsa direksiyon doğru çalışmaz. Montajı ve ayarları yetkin ustaya yaptırın. Direksiyon sistemi güvenlik açısından kritiktir; şüphe halinde ertelemeyin."],
    ],
    faq: [
      ["Direksiyon ağırlaşırsa pompa mı bozulmuştur?", "Hidrolik sistemde pompa olabilir; ancak yağ seviyesi, sızıntı ve kutu da kontrol edilmelidir. Elektrikli sistemde ise farklı nedenler olabilir."],
      ["Elektrikli direksiyonda pompa var mı?", "Hayır; elektrik motoru destek verir, bu yüzden arıza belirtileri ve teşhis farklıdır."],
    ],
  },
  B35: {
    kw: "far seçiminde",
    meta: "Far seçiminde halojen, LED ve xenon uyumu nasıl kontrol edilir? Orijinal donanım, soket, far gövdesi ve uygun ürün onayı rehberi.",
    intro:
      "Far seçiminde halojen, LED ve xenon uyumu, hem görüş kalitesi hem de yasal uygunluk açısından önemlidir. Aracın orijinal aydınlatma tipi, far gövdesinin yapısı ve ampul soketi birlikte düşünülmelidir. Bu yazıda orijinal donanım bilgisini, soket ve far gövdesi uyumunu ve uygun ürün onayını anlatıyoruz.",
    sections: [
      ["Halojen far sistemi", "Halojen ampuller, içinde halojen gazı bulunan filamanlı ampullerdir. Ucuz, yaygın ve değiştirmesi kolaydır. Çoğu araçta orijinal donanım olarak kullanılır. Işık rengi sarımsı beyazdır ve ömrü diğer teknolojilere göre kısadır. Halojen far gövdesi, bu ampulün ışığını doğru yönlendirecek şekilde tasarlanmıştır. Bu nedenle farkı teknolojideki ampulü halojen farda kullanmak ışık dağılımını bozabilir."],
      ["Xenon far sistemi", "Xenon (HID) farlar, gaz dolu bir tüp içinde elektrik arkı oluşturarak ışık üretir. Çalışması için balast ve ateşleyici gibi ek elektronik parçalar gerekir. Işık daha parlak ve daha beyazdır. Xenon far gövdesi ve optik yapısı, bu ışığa göre tasarlanmıştır. Xenon donanımlı araçlarda far yıkama ve seviye ayarı sistemi zorunlu olabilir. Bu sistemlerin parçaları, far değişiminde birlikte düşünülmelidir."],
      ["LED far sistemi", "LED farlar, ışık yayan diyotlarla çalışır; uzun ömürlü ve enerji verimlidir. Birçok yeni araçta LED far gövdesi komple sistemdir ve ışık kaynakları değiştirilemez, far komple yenilenir. Bazı araçlarda ise değiştirilebilir LED modüller bulunur. LED farların soğutma sistemi, sürücü elektroniği ve optik yapısı araca özeldir. Bu yüzden LED far parçalarında orijinal uyumluluk bilgisi özellikle önemlidir."],
      ["Orijinal donanıma sadık kalmak", "Aracınızın orijinal far tipi, ruhsat ve üretici donanım listesinde belirtilmiştir. Halojen bir farı xenon ya da LED ampulle dönüştürmek, far gövdesi bu ışığa uygun tasarlanmadığı için karşıdan gelen sürücüleri kamaştırabilir ve yasal uygunluk sorunu yaratabilir. Dönüşüm yapılacaksa ürünün onaylı ve araca uygun olduğundan emin olun. Aksi halde teknik muayenede sorun yaşanabilir."],
      ["Soket ve bağlantı uyumu", "Ampul soket tipi, aracın far gövdesi ve kablo tesisatına uygun olmalıdır. H1, H4, H7 gibi farklı soket tipleri bulunur ve birbirleriyle değiştirilemez. Xenon ve LED sistemlerde konnektör, balast ve kontrol ünitesi bağlantıları da önemlidir. Eski ampulün üzerindeki kodu okuyun ve ürün sayfasındaki uyumlulukla karşılaştırın. Kablo tesisatında ek yük, sigorta ve röle gerektirebilir."],
      ["Far gövdesi ve ışık dağılımı", "Far gövdesinin yansıtıcı yüzeyi ve merceği, ışığı yola doğru ve karşıdan gelen sürücüyü rahatsız etmeden dağıtır. Farklı teknolojideki ampul bu dağılımı bozar. Far gövdesi kırık, buğulanmış ya da sararmış ise ışık verimi düşer. Far yenilerken de araç uyumluluğunu, kasa makyaj dönemini ve sürüş tarafını kontrol edin. Far ayarının yapılması da önemlidir."],
      ["Uygun ürün onayı ve yasal çerçeve", "Araç aydınlatma ürünlerinde üretim standartları ve onay işaretleri bulunur. Ürünün onaylı olduğunu ambalajdan ve üretici bilgisinden doğrulayın. Onaysız ürünler hem güvenlik hem muayene açısından risk taşır. Yasal çerçeveyi ve muayene koşullarını bilmeden dönüşüm yapmayın. Emin olmadığınızda yetkili servis ya da güvenilir bir aydınlatma ustası ile görüşün."],
    ],
    faq: [
      ["Halojen farı LED ampulle değiştirebilir miyim?", "Far gövdesi LED için tasarlanmadığından ışık dağılımı bozulabilir ve yasal sorun doğabilir; onaylı ve uyumlu ürün gerekir."],
      ["Far ampul tipi nasıl öğrenilir?", "Eski ampulün üzerindeki kod, kullanım kılavuzu ya da araç uyumluluk listesinden öğrenilir."],
    ],
  },
  B36: {
    kw: "stop lambasında",
    meta: "Stop lambasında sağ, sol, iç ve dış parça ayrımı nasıl yapılır? Taraf tanımı, bagaj ve çamurluk tarafı ile makyaj farkı rehberi.",
    intro:
      "Stop lambasında sağ, sol, iç ve dış parça ayrımı, sipariş hatalarının en sık yaşandığı konulardan biridir. Çoğu araçta stop lambası iki parçadan oluşur: çamurluk tarafı ve bagaj kapağı tarafı. Bu yazıda taraf tanımını, bagaj ve çamurluk parçası ayrımını ve makyaj farkını anlatıyoruz.",
    sections: [
      ["Sağ ve sol nasıl tanımlanır?", "Araç parçalarında sağ ve sol, aracın içinde sürücü gibi öne bakıldığında belirlenir. Yani aracın sol tarafı, sürücü koltuğuna oturan kişinin solundur. Bu tanım, soldan direksiyonlu araçlarda sürücü tarafıdır. Arkadan bakan kişinin sağı ile aracın sağı farklı olabilir; bu yüzden karışıklık yaşanır. Sipariş verirken tarafın 'aracın kendisine göre' belirlendiğini unutmayın. Ürün sayfasında 'sağ' ya da 'sol' ifadesinin hangi esasa göre yazıldığını kontrol edin."],
      ["İç ve dış stop ayrımı", "Birçok araçta stop lambası iki ayrı parçadır: dış stop çamurluk üzerinde, iç stop ise bagaj kapağı üzerinde bulunur. Bu iki parçanın şekli, bağlantısı ve ampul düzeni farklıdır. 'Dış stop' çamurluk tarafı, 'iç stop' bagaj kapağı tarafıdır. Bazı araçlarda stop tek parçadır; bazılarında ise ayrıca bağlantı ve ampul yuvası bulunur. Sipariş verirken hangi parçanın gerektiğini net belirleyin."],
      ["Bagaj ve çamurluk tarafı", "Bagaj kapağı tarafındaki stop lambası, kapak ile birlikte hareket eder ve konnektörü kapak içindeki kablo tesisatına bağlanır. Çamurluk tarafındaki stop ise sabit gövdeye bağlıdır. Bu farklı bağlantılar nedeniyle, bagaj ve çamurluk stopları birbirinin yerine kullanılamaz. Parça numarasını eski stopla karşılaştırın. Sağ ve sol bagaj stopları da aynı değildir."],
      ["Makyaj farkı", "Aracın makyajlı ve makyajsız versiyonlarında stop lambasının tasarımı, ampul tipi ve konnektörü değişebilir. LED stop ya da farklı grafikli stop, makyajla birlikte gelebilir. Bu nedenle üretim yılı ve makyaj dönemi, parça seçiminde belirleyicidir. Ürün sayfasındaki yıl aralığını aracınızla karşılaştırın. Emin değilseniz şasi numarasıyla doğrulama yapın."],
      ["Ampul yuvası ve konnektör", "Stop lambasında ampul yuvası ve konnektör, ürüne dahil olabilir ya da ayrı gerekebilir. Bazı lambalar boş gövde olarak gelir ve ampul yuvasını eski lambadan aktarmanız gerekir. Ürün açıklamasında 'ampul yuvalı' ya da 'ampulsüz' ifadesini arayın. LED stoplarda ise sürücü elektroniği ve konnektör yapısı araç uyumuna göre değişir."],
      ["Uyumluluk kontrolü", "Marka, model, üretim yılı, kasa tipi ve donanım seviyesi, stop uyumunun temelidir. Station wagon, hatchback ve sedan kasalarda stop farklıdır. Ürün sayfasındaki uyumluluk listesine bakın. Eski stopun fotoğrafını satıcıyla paylaşmak doğrulamayı kolaylaştırır. Parçayı aldıktan sonra takmadan önce eski stopla yan yana koyup karşılaştırın."],
      ["Montaj ve sızdırmazlık", "Stop lambası montajında conta ve bağlantı vidaları doğru yerleştirilmeli, su sızdırmazlığı sağlanmalıdır. Nem alan stop lambası ampul ve elektrik bağlantılarına zarar verir. Montaj sonrası tüm ışık fonksiyonlarını, yani fren, sinyal, geri vites ve sis fonksiyonlarını test edin. Işık ayarı ve ampul uyarı sistemi olan araçlarda, ampul tipine dikkat edin; yanlış ampul uyarı verebilir."],
    ],
    faq: [
      ["Stop lambasında sağ ve sol nasıl belirlenir?", "Araca sürücü gibi öne bakıldığında belirlenir; aracın sol tarafı sürücü koltuğunun solundur."],
      ["İç stop ile dış stop farkı nedir?", "Dış stop çamurluk üzerinde, iç stop bagaj kapağı üzerindedir; şekil ve bağlantıları farklıdır."],
    ],
  },
};
