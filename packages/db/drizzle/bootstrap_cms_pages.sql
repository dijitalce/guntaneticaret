-- CMS sayfaları (Hakkımızda vb.) — ana tenant id bootstrap_main_tenant.sql ile aynı
-- phpMyAdmin → SQL → Yapıştır → Git

SET NAMES utf8mb4;

SET @tenant := '11111111-1111-4111-8111-111111111111';

INSERT INTO `pages` (`id`, `tenant_id`, `title`, `slug`, `body`, `is_published`, `created_at`, `updated_at`)
SELECT UUID(), @tenant, 'Hakkımızda', 'hakkimizda', 'Güntan Oto Yedek Parça hakkında bilgiler.', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM pages WHERE tenant_id=@tenant AND slug='hakkimizda');

INSERT INTO `pages` (`id`, `tenant_id`, `title`, `slug`, `body`, `is_published`, `created_at`, `updated_at`)
SELECT UUID(), @tenant, 'Mesafeli Satış Sözleşmesi', 'mesafeli-satis', 'Sözleşme metni.', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM pages WHERE tenant_id=@tenant AND slug='mesafeli-satis');

INSERT INTO `pages` (`id`, `tenant_id`, `title`, `slug`, `body`, `is_published`, `created_at`, `updated_at`)
SELECT UUID(), @tenant, 'Gizlilik', 'gizlilik', 'KVKK ve gizlilik.', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM pages WHERE tenant_id=@tenant AND slug='gizlilik');

INSERT INTO `pages` (`id`, `tenant_id`, `title`, `slug`, `body`, `is_published`, `created_at`, `updated_at`)
SELECT UUID(), @tenant, 'İade Şartları', 'iade', 'İade koşulları.', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM pages WHERE tenant_id=@tenant AND slug='iade');

SELECT slug, title FROM pages WHERE tenant_id=@tenant;
