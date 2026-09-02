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
