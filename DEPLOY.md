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
- `docker compose up -d` postgres redis meilisearch (MinIO veya S3)
- `pnpm db:migrate`
- İlk kurulum: `pnpm db:seed`
- `pnpm db:sync-catalog`
- `pnpm db:sync-tenants` — ana + 6 park domain’i birincil hostname yapar
- Worker ayrı süreç
- `scripts/backup.sh` cron ile günlük
- `STOREFRONT_URL=https://guntanotoyedekparca.com`
- `ADMIN_URL` ve `BETTER_AUTH_SECRET` üretim değerleri
- `products.xml` sunucuda tutulur, Git’e konmaz; `pnpm import:xml`
- Basbug JSON da Git’e konmaz (~85MB / ~319k ürün). Sunucuya ayrı yükle, sonra import et (aşağıda).

## AWS RDS PostgreSQL (Supabase → Amazon)

Hostinger Cloud Startup’ta Postgres yok. DB’yi **RDS**’e almak kod değiştirmez — sadece `DATABASE_URL`. Disk 20 GB (Free Tier) / istediğin kadar (ücretli); 500 MB kota biter.

### 1) RDS oluştur (AWS Console)

1. Region: **Europe (Frankfurt) `eu-central-1`** (Hostinger’a daha yakın).
2. RDS → Create database → **Standard create** → Engine **PostgreSQL 16**.
3. Templates: hesap uygunsa **Free tier**. Değilse `db.t3.micro` veya `db.t4g.micro` (katalog büyürse `db.t3.small`).
4. Storage: Free Tier için **gp2, 20 GB** (gp3 / Multi-AZ seçme — ücretlenir).
5. Credentials: master user + güçlü şifre (kaydet).
6. Connectivity:
   - Public access: **Yes** (Hostinger’dan bağlanmak için).
   - VPC security group: inbound **5432** yalnızca Hostinger sunucu IP + senin IP.
7. Additional config → Initial database name: `guntan`.
8. Create → endpoint: `xxx.xxx.rds.amazonaws.com`.

Connection string:

```
postgres://MASTER_USER:SIFRE@ENDPOINT:5432/guntan?sslmode=require
```

Şifrede `@` `#` varsa URL-encode et.

### 2) Veriyi taşı

Supabase **direct** URI kullan (`db.<ref>.supabase.co:5432`, pooler **6543 değil**).

```bash
export SRC='postgres://postgres:...@db.XXXX.supabase.co:5432/postgres'
export DST='postgres://USER:SIFRE@xxx.rds.amazonaws.com:5432/guntan?sslmode=require'
./scripts/pg-copy.sh
```

macOS’ta `pg_dump` yoksa: `brew install libpq && brew link --force libpq`.

### 3) Hostinger `.env`

```
DATABASE_URL=postgres://USER:SIFRE@ENDPOINT:5432/guntan?sslmode=require
```

Uygulamayı restart et. Kontrol: anasayfa, bir kategori, admin sipariş listesi.

### 4) Bilinen sınırlar

- Free Tier **12 ay** (yeni hesap); sonra instance saati + disk faturalanır.
- `t3.micro` = 1 GB RAM. Büyük listing yavaşsa `t3.small`.
- Hostinger ↔ Frankfurt gecikmesi kalır; kota/throttling biter. En hızlısı ileride app+DB aynı VPS.
- RDS’de prepared statement açık (pooler yok). Import/prune **direct** endpoint ile çalışır.

---

## Supabase + katalog import (canlı)

1. **Kod:** GitHub’a push → sunucuda `git pull` → `pnpm install` → build/restart (mevcut Hostinger akışın).
2. **Env:** Sunucu `.env` içinde `DATABASE_URL` = Supabase connection string.
   - Uzun import için **Direct** veya **Session mode** kullan (`db.<ref>.supabase.co:5432` / pooler session). Transaction pooler (6543) büyük upsert’ta kopabilir.
   - Supabase Dashboard → Project Settings → Database → Connection string (URI), şifreyi koy.
3. **Dosyalar (Git dışı):**
   - `products.xml` → uygulama köküne (veya bildiğin path)
   - Basbug: `all_products.json` → örn. `/home/.../data/basbug/all_products.json`
   - Yerelden: `scp "/Users/.../Desktop/aktan-xml/data/basbug/all_products.json" user@sunucu:/path/data/basbug/`
4. **Import (sunucuda, uygulama dizininde):**

```bash
# Güntan XML (zaten yaptıysan atla)
pnpm import:xml

# Basbug — path override
BASBUG_JSON_PATH=/path/to/basbug/all_products.json pnpm import:basbug

# Sadece mükerrer (OE+marka) yeniden hesaplamak için
pnpm import:dedupe
```

Kurlar (EUR/USD → TL): isteğe bağlı `BASBUG_EUR_TRY=56.3` `BASBUG_USD_TRY=48.4`.

Import uzun sürer (yüz binlerce satır). SSH oturumu kopmasın diye:

```bash
nohup env BASBUG_JSON_PATH=/path/to/all_products.json pnpm import:basbug > /tmp/basbug-import.log 2>&1 &
tail -f /tmp/basbug-import.log
```

5. **Sonuç:** Basbug ürünleri `BASBUG` tedarikçisi altında; aynı OE+markada pahalı kopyalar silinir (siparişte geçenler `inactive` kalır). `compileVisibility` import sonunda çalışır.

## Disk kotası ve hız (Supabase Free 500 MB)

Katalog yüz binlerce satır + mükerrer Basbug kopyaları + ana sitenin `tenant_catalog_index` kopyası kotayı aşıyor. Kota dolunca sorgular da yavaşlar.

Sunucuda, yeni kod deploy + restart **sonra**:

```bash
# 1) Ana sitenin gereksiz katalog kopyasını sil
pnpm db:compile-visibility

# 2) Pasif mükerrer ürünleri ve fitment/OEM satırlarını sil
pnpm db:prune

# 3) Kota hâlâ yüksekse (tablolar kilitlenir). Direct DB URL kullan
#    (pooler / 6543 VACUUM kabul etmez):
VACUUM_FULL=1 pnpm db:prune

# 4) Listeleme indeksleri — prune’dan sonra, boş disk varken
pnpm db:migrate
```

`VACUUM FULL` tablonun yeniden yazılması için geçici boş disk ister. Kota tamamen doluysa önce `pnpm db:prune` (FULL olmadan), ardından mümkünse FULL.

Kalıcı çözüm: **AWS RDS** (yukarıdaki bölüm) veya Hostinger VPS + Docker Postgres. Yüz binlerce oto parçası Supabase Free 500 MB’ye sığmaz.
