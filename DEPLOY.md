# Production checklist

Ana site: **guntanotoyedekparca.com** (tüm katalog).

Park edilmiş grup domainleri aynı storefront sürecine bağlanır; Host başlığı korunur:

- `japongrupotoyedekparca.com`
- `almangrupotoyedekparca.com`
- `italyangrupotoyedekparca.com`
- `fransizgrupotoyedekparca.com`
- `abdgrupotoyedekparca.com`
- `koregrupotoyedekparca.com`

Bunları ana domain’e **yönlendirme**; alias / parked / additional domain olarak aynı uygulamaya bağla. Nginx/proxy:

```
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
```

`www.` → apex 301 (Cloudflare veya hosting) isteğe bağlıdır; uygulama `www.` önekini zaten düşer.

## Kurulum

- Cloudflare (veya host) TLS
- `docker compose up -d` → yerel MySQL + phpMyAdmin (`http://localhost:8080`) + redis + meilisearch (+ MinIO)
- Canlı DB: **Hostinger MySQL** (aşağıda)
- `pnpm db:migrate`
- İlk kurulum: `pnpm db:seed`
- `pnpm db:sync-catalog`
- `pnpm db:sync-tenants` — ana + 6 park domain’i birincil hostname yapar
- Worker ayrı süreç
- `scripts/backup.sh` cron ile günlük (`mysqldump`)
- `STOREFRONT_URL=https://guntanotoyedekparca.com`
- `ADMIN_URL` ve `BETTER_AUTH_SECRET` üretim değerleri
- `products.xml` sunucuda tutulur, Git’e konmaz; `pnpm import:xml`
- Basbug JSON da Git’e konmaz; `pnpm import:sync` API'den çeker (aşağıda).

## Hostinger MySQL

phpMyAdmin: https://auth-db2116.hstgr.io/

Uygulama **aynı Hostinger sunucusunda** ise host genelde `localhost`. Dışarıdan (Mac) bağlanmak için hPanel → Remote MySQL’de IP açılmalı; host `auth-db2116.hstgr.io`.

`.env` örneği (şifrede `&` → `%26`, `+` → `%2B`):

```
DATABASE_URL=mysql://USER:PASS@localhost:3306/DBNAME
# veya uzak:
# DATABASE_URL=mysql://USER:PASS@auth-db2116.hstgr.io:3306/DBNAME
```

### Uzaktan (Mac) bağlanmak

hPanel → **Databases → Remote MySQL** → kendi genel IP’ni ekle (`%` tüm IP’lere izin verir, daha riskli).

IP eklenmeden dışarıdan `pnpm db:migrate` şu hatayı verir: `Access denied for user ...@'IP'`.

Alternatif: phpMyAdmin’e `packages/db/drizzle/*.sql` dosyasını import et (statement-breakpoint satırlarını sil veya migrate.ts ile aynı temizlik).

phpMyAdmin: https://auth-db2116.hstgr.io/

### İlk kurulum sırası

1. Hostinger’da MySQL kullanıcı + database oluştur (veya mevcutu kullan).
2. Sunucu `.env` → `DATABASE_URL` ayarla.
3. `pnpm db:migrate` **veya** phpMyAdmin Import → `packages/db/drizzle/0000_init.phpmyadmin.sql`
4. `pnpm db:seed` (veya sadece `pnpm db:ensure-admin`)
5. `pnpm db:sync-catalog` && `pnpm db:sync-tenants`
6. Katalog:

```bash
pnpm import:xml
BASBUG_JSON_PATH=/path/to/basbug/all_products.json pnpm import:basbug
pnpm import:dedupe
pnpm db:compile-visibility
```

Import uzun sürer. SSH kopmasın:

```bash
nohup env BASBUG_JSON_PATH=/path/to/all_products.json pnpm import:basbug > /tmp/basbug-import.log 2>&1 &
tail -f /tmp/basbug-import.log
```

Kurlar (EUR/USD → TL): Başbuğ API'nin kendi satış kuru, yoksa TCMB. Elle sabitlemek için `BASBUG_EUR_TRY=56.3` `BASBUG_USD_TRY=48.4`.

### Otomatik fiyat/stok güncellemesi (12 saatte bir)

`pnpm import:sync` şunları yapar:

1. Altay (Eryaz GetProduct) XML'ini indirir → `products.xml`
2. Başbuğ API'den malzeme + net fiyat (`nf`) + stok (`BASBUG_DEPO`) + döviz çeker → `data/basbug/all_products.json`
3. Sadece değişen/yeni ürünleri import eder
4. Aynı OE+marka için stoktaki en ucuz ürünü aktif bırakır, görünürlüğü derler

Marj her seferinde tedarikçinin ham fiyatından hesaplanır, tekrar çalıştırmak marjı ikilemez.
Marj dilimleri admin → Katalog → Fiyat oranları'ndan düzenlenir (`app_settings` tablosu, ilk erişimde otomatik oluşur);
kayıt yoksa `price-tiers.ts` içindeki varsayılanlar kullanılır.
**Senkron açıkken `pnpm import:price-tiers --from-cost` çalıştırma** — marj üstüne marj biner.

Kurulum:

1. Sunucu `.env` dosyasına `ERYAZ_*` ve `BASBUG_*` değerlerini ekle (`.env.example`'a bak).
2. Eryaz sadece whitelist'teki IP'ye yanıt verir; Node uygulamasının çalıştığı sunucunun IP'si whitelist'te olmalı.
3. İlk çalıştırmadan önce yedek al: `./scripts/backup.sh`
4. Elle bir kez dene: `./scripts/supplier-sync.sh` → `logs/supplier-sync-YYYYMM.log`
   Tedarikçi listesinden çıkan ürünler `missing_from_feed` olur (sitede görünmez), listeye dönünce tekrar açılır.
   Liste mevcut ürünlerin %80'inden azsa bu işaretleme atlanır.
5. hPanel → Gelişmiş → Cron Jobs → özel komut:

```bash
/home/KULLANICI/.../guntaneticaret/scripts/supplier-sync.sh
```

   Zamanlama `0 6,18 * * *` (sunucu saati UTC ise `0 3,15 * * *`). Başbuğ verisi 02:00–05:00 arası yenilendiği için bu saatler güvenli.
   Cron `node` bulamazsa komutun başına `NODE_BIN=/path/to/node` ekle.

Aynı anda iki senkron çalışmaz (kilit dosyası). Başbuğ tek oturuma izin verir; senkron bitince oturumu kapatır.
Başbuğ stoğu devre dışı bırakmak için `.env`: `BASBUG_USE_STOCK=0`.

### Altay ürün görselleri (otoparcasan.com, izinli)

Altay XML'inde `PicturePath` boş geldiği için görseller otoparcasan.com'dan alınır. Cron (15 dakikada bir, `*/15 * * * *`). Deploy betiklerin çalıştırma iznini düşürdüğü için başında `bash` olmalı:

```bash
bash /home/KULLANICI/.../hbuilds/current/nodejs/scripts/otoparcasan-images.sh
```

- Haftada bir site haritalarından eşleme tablosu kurulur; ürün yalnızca marka ve üretici parça no birlikte tutarsa eşlenir.
- Görseli olmayan aktif Altay ürünleri stoktakilerden başlayarak işlenir. İzinli olduğumuz için 2 sn'de bir istek atılır (`OTOPARCASAN_DELAY_MS`). Hostinger cron süreçlerini ~16 dk'da öldürdüğü için her çalışma en fazla 14 dk sürer; ölen sürecin kilidi bir sonraki çalışmada temizlenir.
- Görseller `guntan-images/files/` altına yazılır (guntan-sync.env ile aynı klasör), `product_images`'a eklenir. `/urun-gorsel/*` adresini `hostinger-start.mjs` bu klasörden sunar. `public_html`'e yazılmaz: Hostinger deploy onu sıfırlıyor.
- Durum ve log: `guntan-images/`. Eşlemeyi elle yenilemek için `--rebuild-map`; dosyası kaybolan görselleri silip yeniden sıraya almak için `--repair`.

### Diğer ürün görselleri (parcatedarik.com)

Ayrı cron gerekmez: `otoparcasan-images.sh` işini bitirince kalan süreyle `scripts/parcatedarik-images.sh`'yi çalıştırır (toplam ≤ 14 dk).

- Görseli olmayan tüm aktif ürünler (çoğu Başbuğ) hedeflenir. Site haritasında ürün yok; üreticilerimize karşılık gelen marka listeleme sayfaları (`/psa?pagesize=120&pagenumber=N`) taranır ve `guntan-images/parcatedarik-index.tsv`'ye yazılır. Ayda bir baştan taranır (`--recrawl` ile elle).
- Eşleme ürün başlığındaki marka + parça numarasıyla yapılır; `psa` sayfası GM (Opel) orijinallerini de listeler. Üretici adı tutmayan markalar `BRAND_ALIASES` / `SLUG_ALIASES` içinde.
- Site birçok üründe aynı marka afişini ("Genuine Parts") kullanıyor: aynı görsel 3 üründe çıkarsa afiş sayılır, eklendiği ürünlerden silinir (`parcatedarik-generic.txt`). Orijinal PSA ürünlerinde fotoğraf yerine katalog şeması gelebiliyor; bilerek kabul ediliyor.
- 2 sn'de bir istek. `--report`: indirmeden eşleşme sayısını ve örnekleri log'a yazar.

### Garanti BBVA sanal POS

- `GARANTI_*` değerleri hPanel → Node.js → Ortam değişkenleri'ne girilir (`.env.example`'a bak). Dördü (merchant, terminal, prov şifresi, 3D store key) dolmadan kart seçeneği görünmez.
- Bankaya bildirilecek dönüş adresi (başarılı ve hatalı için aynı): `https://guntanotoyedekparca.com/api/payments/garanti/callback`
- `GARANTI_MODE=TEST` banka test ortamını kullanır, ödeme sayfasında "Test modu" yazar. Canlı bilgiler gelince `PROD`.
- Kart siparişi banka onayına kadar `Ödeme bekliyor` durumunda kalır, sepet silinmez. Onayda stok düşer, sepet boşalır. Hata/iptalde sipariş iptal edilir, sepet yerinde kalır. 30 dakikada tamamlanmayanlar otomatik iptal edilir.

### Aras Kargo

- `ARAS_*` değerleri hem hPanel ortam değişkenlerine (admin'deki "Aras Kargo'ya ver" için) hem `~/guntan-sync.env` dosyasına (takip cron'u için) eklenir.
- "Aras Kargo'ya ver": Aras'ta gönderi kaydı açılır (entegrasyon kodu = sipariş no), sipariş `Kargoda` olur. Takip numarası paket şubeye teslim edilince oluşur.
- Takip cron'u (saatte bir, `15 * * * *`):

```bash
/home/KULLANICI/.../hbuilds/current/nodejs/scripts/shipment-sync.sh
```

  Takip numarasını siparişe yazar, teslim edilenleri `Tamamlandı` yapar, yarım kalan kart siparişlerini temizler. Log: `logs/shipment-sync-YYYYMM.log`.

### Disk / prune

```bash
pnpm db:compile-visibility
pnpm db:prune
# Gerekirse (tabloları yeniden yazar):
VACUUM_FULL=1 pnpm db:prune
```

MySQL’de `OPTIMIZE TABLE` kullanılır (Postgres `VACUUM` yok).

### Bilinen sınırlar

- Shared MySQL bağlantı limiti düşük — pool `max` 5 civarı (kodda ayarlı).
- Uzun import’ta kopma olursa batch CLI’ler kaldığı yerden / yeniden çalıştırılabilir (upsert).
- Eski Supabase/Postgres verisi taşınmaz; ürün kaynağı XML + Basbug.
