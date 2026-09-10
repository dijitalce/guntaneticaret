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
- Basbug JSON da Git’e konmaz. Sunucuya ayrı yükle, sonra import et.

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

Kurlar (EUR/USD → TL): isteğe bağlı `BASBUG_EUR_TRY=56.3` `BASBUG_USD_TRY=48.4`.

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
