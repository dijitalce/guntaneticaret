# Güntan Oto Yedek Parça — Multi-tenant e-ticaret

Tek kod tabanı, tek merkezi katalog. Ziyaretçinin **Host** başlığı tenant’ı seçer.

## Domainler

| Host | Tenant | Katalog |
| --- | --- | --- |
| `guntanotoyedekparca.com` | Güntan (ana) | Tüm parçalar |
| `japongrupotoyedekparca.com` | Japon | Japon grubu |
| `almangrupotoyedekparca.com` | Alman | Alman grubu |
| `italyangrupotoyedekparca.com` | İtalyan | İtalyan grubu |
| `fransizgrupotoyedekparca.com` | Fransız | Fransız grubu |
| `abdgrupotoyedekparca.com` | ABD | Amerikan grubu |
| `koregrupotoyedekparca.com` | Kore | Kore grubu |

Park edilmiş 6 domain **aynı uygulamaya** bağlanır; ana domain’e 301 ile yönlendirilmez. Aksi halde Host kaybolur ve hepsi tam kataloğu gösterir. `www.` öneki uygulamada otomatik düşülür.

Yerelde `*.localhost` alias’ları çalışır (canonical / sitemap yine üretim hostname’ini kullanır).

## Yerel geliştirme

Docker Desktop gerekir (Postgres, Redis, Meilisearch, MinIO).

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm db:sync-catalog
pnpm db:sync-tenants
pnpm dev
```

- http://guntan.localhost:3000 — tüm katalog
- http://japon.localhost:3000 — Japon grubu (diğer gruplar: `alman`, `italy`, `fransa`, `abd`, `kore`)
- http://localhost:3001 — admin (`admin@guntan.local` / `Admin123!`)

Üretim domain eşlemesini yenilemek için: `pnpm db:sync-tenants`.

XML katalog (`products.xml`) repoya girmez. Yerelde: `pnpm import:xml`.

## Yapı

- `apps/storefront` — Next.js vitrin
- `apps/admin` — yönetim paneli
- `apps/worker` — BullMQ (XML, visibility, search)
- `packages/*` — domain katmanları

Canlıya alma adımları: [DEPLOY.md](DEPLOY.md).
