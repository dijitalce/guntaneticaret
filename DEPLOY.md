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

5. **Sonuç:** Basbug ürünleri `BASBUG` tedarikçisi altında; aynı OE+markada pahalı kopyalar `inactive` (vitrinde yok, DB’de durur). `compileVisibility` import sonunda çalışır.
