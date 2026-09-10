-- Ana site tenant + domain (404/beyaz ekran için)
-- phpMyAdmin → u140832223_guntaneticaret → SQL → Yapıştır → Git

SET NAMES utf8mb4;

INSERT INTO `tenants` (`id`, `name`, `slug`, `status`, `visibility_mode`, `created_at`, `updated_at`)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Güntan Oto Yedek Parça',
  'guntan',
  'active',
  'ALL',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  `status` = 'active',
  `visibility_mode` = 'ALL',
  `name` = VALUES(`name`);

INSERT INTO `tenant_domains` (`id`, `tenant_id`, `hostname`, `is_primary`, `created_at`, `updated_at`)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'guntanotoyedekparca.com',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  `tenant_id` = VALUES(`tenant_id`),
  `is_primary` = 1;

INSERT INTO `tenant_settings` (
  `id`, `tenant_id`, `site_name`, `phone`, `whatsapp`, `email`, `address`,
  `social_json`, `theme_tokens`,
  `default_meta_title`, `default_meta_description`,
  `logo_url`, `favicon_url`, `placeholder_image_url`, `og_image_url`,
  `min_order_amount`, `payment_expire_hours`,
  `created_at`, `updated_at`
) VALUES (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'Güntan Oto Yedek Parça',
  '0216 000 00 00',
  '905550000000',
  'info@guntanotoyedekparca.com',
  'İstanbul',
  JSON_OBJECT('allCatalogUrl', 'https://guntanotoyedekparca.com'),
  JSON_OBJECT(
    'primary', '#b42318',
    'secondary', '#1f2937',
    'accent', '#c2410c',
    'background', '#f7f5f2',
    'foreground', '#16181d',
    'border', '#d9d4cc',
    'muted', '#ece8e1',
    'mutedForeground', '#5c5f66',
    'card', '#ffffff',
    'destructive', '#b42318',
    'radius', '0.5rem',
    'font', 'Inter, ui-sans-serif, system-ui, sans-serif'
  ),
  'Güntan Oto Yedek Parça',
  'Güntan Oto Yedek Parça için oto yedek parça.',
  '/brand/logo.png',
  '/favicon.png',
  '/placeholder-product.jpg',
  '/brand/mark.png',
  0,
  72,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  `site_name` = VALUES(`site_name`);

SELECT t.slug, t.status, d.hostname, d.is_primary, s.site_name
FROM tenants t
JOIN tenant_domains d ON d.tenant_id = t.id
LEFT JOIN tenant_settings s ON s.tenant_id = t.id;
