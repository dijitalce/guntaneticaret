CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  visibility_mode text NOT NULL DEFAULT 'ALL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_uidx ON tenants (slug);

CREATE TABLE IF NOT EXISTS tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hostname text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_domains_hostname_uidx ON tenant_domains (hostname);
CREATE INDEX IF NOT EXISTS tenant_domains_tenant_idx ON tenant_domains (tenant_id);

CREATE TABLE IF NOT EXISTS tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_name text NOT NULL,
  logo_url text,
  logo_dark_url text,
  favicon_url text,
  placeholder_image_url text,
  phone text,
  whatsapp text,
  email text,
  address text,
  social_json jsonb DEFAULT '{}'::jsonb,
  theme_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_meta_title text,
  default_meta_description text,
  og_image_url text,
  ga_id text,
  gtm_id text,
  custom_scripts text,
  header_html text,
  footer_html text,
  min_order_amount integer NOT NULL DEFAULT 0,
  payment_expire_hours integer NOT NULL DEFAULT 72,
  seo_title_template text DEFAULT '{page} | {siteName}',
  seo_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_settings_tenant_uidx ON tenant_settings (tenant_id);

CREATE TABLE IF NOT EXISTS tenant_catalog_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_catalog_rules_uidx ON tenant_catalog_rules (tenant_id, kind, target_id);

CREATE TABLE IF NOT EXISTS tenant_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_holder text NOT NULL,
  iban text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  seo_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_brands_slug_uidx ON vehicle_brands (slug);

CREATE TABLE IF NOT EXISTS brand_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS brand_groups_slug_uidx ON brand_groups (slug);

CREATE TABLE IF NOT EXISTS brand_group_members (
  group_id uuid NOT NULL REFERENCES brand_groups(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, brand_id)
);

CREATE TABLE IF NOT EXISTS vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  seo_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_models_brand_slug_uidx ON vehicle_models (brand_id, slug);

CREATE TABLE IF NOT EXISTS vehicle_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  body_code text,
  year_from integer,
  year_to integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_engines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES vehicle_generations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  fuel text,
  displacement_cc integer,
  power_hp integer,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  path text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  seo_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_path_uidx ON categories (path);

CREATE TABLE IF NOT EXISTS manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS manufacturers_slug_uidx ON manufacturers (slug);

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_code_uidx ON suppliers (code);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  manufacturer_id uuid REFERENCES manufacturers(id),
  sku text NOT NULL,
  external_id text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  barcode text,
  price numeric(12,2) NOT NULL,
  compare_at_price numeric(12,2),
  vat_rate numeric(5,2) NOT NULL DEFAULT 20,
  stock_qty integer NOT NULL DEFAULT 0,
  reserved_qty integer NOT NULL DEFAULT 0,
  stock_status text NOT NULL DEFAULT 'in_stock',
  status text NOT NULL DEFAULT 'active',
  content_hash text,
  source text NOT NULL DEFAULT 'manual',
  published_at text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS products_supplier_external_uidx ON products (supplier_id, external_id);
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_uidx ON products (slug);
CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);
CREATE INDEX IF NOT EXISTS products_sku_idx ON products (sku);

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  s3_key text NOT NULL,
  url text NOT NULL,
  alt text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_oems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  raw text NOT NULL,
  normalized text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_oems_product_norm_uidx ON product_oems (product_id, normalized);
CREATE INDEX IF NOT EXISTS product_oems_normalized_idx ON product_oems (normalized);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS product_fitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vehicle_brand_id uuid NOT NULL REFERENCES vehicle_brands(id),
  vehicle_model_id uuid NOT NULL REFERENCES vehicle_models(id),
  vehicle_generation_id uuid REFERENCES vehicle_generations(id),
  vehicle_engine_id uuid REFERENCES vehicle_engines(id),
  year_from integer,
  year_to integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_fitments_uidx ON product_fitments (product_id, vehicle_model_id, vehicle_generation_id, vehicle_engine_id);
CREATE INDEX IF NOT EXISTS product_fitments_brand_model_idx ON product_fitments (vehicle_brand_id, vehicle_model_id);

CREATE TABLE IF NOT EXISTS tenant_catalog_index (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (tenant_id, product_id)
);

CREATE TABLE IF NOT EXISTS tenant_visible_brands (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  PRIMARY KEY (tenant_id, brand_id)
);

CREATE TABLE IF NOT EXISTS tenant_product_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price numeric(12,2),
  compare_at_price numeric(12,2),
  min_qty integer,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_product_overrides_uidx ON tenant_product_overrides (tenant_id, product_id);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_uidx ON customers (email);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_sessions_token_uidx ON customer_sessions (token_hash);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Adres',
  full_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  postal_code text,
  is_default integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL,
  model_id uuid NOT NULL,
  generation_id uuid,
  engine_id uuid,
  year integer,
  label text,
  is_selected integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  qty integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_product_uidx ON cart_items (cart_id, product_id);

CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  session_id text,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  type text NOT NULL DEFAULT 'percent',
  value numeric(12,2) NOT NULL,
  min_subtotal numeric(12,2),
  is_active integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_tenant_code_uidx ON coupons (tenant_id, code);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  customer_id uuid REFERENCES customers(id),
  order_no text NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment',
  email text NOT NULL,
  phone text NOT NULL,
  full_name text NOT NULL,
  shipping_address jsonb NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  shipping_total numeric(12,2) NOT NULL DEFAULT 0,
  discount_total numeric(12,2) NOT NULL DEFAULT 0,
  grand_total numeric(12,2) NOT NULL,
  coupon_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_no_uidx ON orders (order_no);
CREATE INDEX IF NOT EXISTS orders_tenant_idx ON orders (tenant_id);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  name text NOT NULL,
  sku text NOT NULL,
  image_url text,
  qty integer NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  method text NOT NULL DEFAULT 'bank_transfer',
  status text NOT NULL DEFAULT 'awaiting',
  amount numeric(12,2) NOT NULL,
  provider_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier text,
  tracking_no text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  body text NOT NULL DEFAULT '',
  meta_title text,
  meta_description text,
  is_published integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pages_tenant_slug_uidx ON pages (tenant_id, slug);

CREATE TABLE IF NOT EXISTS menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS menus_tenant_key_uidx ON menus (tenant_id, key);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  label text NOT NULL,
  href text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  image_url text NOT NULL,
  href text,
  placement text NOT NULL DEFAULT 'home',
  sort_order integer NOT NULL DEFAULT 0,
  is_active integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  title text,
  config jsonb DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS homepage_sections_tenant_key_uidx ON homepage_sections (tenant_id, key);

CREATE TABLE IF NOT EXISTS redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  old_path text NOT NULL,
  new_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  body text NOT NULL DEFAULT '',
  is_published integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_tenant_slug_uidx ON blog_posts (tenant_id, slug);

CREATE TABLE IF NOT EXISTS xml_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  name text NOT NULL,
  url text,
  file_path text,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule_cron text,
  is_active integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS xml_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id uuid NOT NULL REFERENCES xml_feeds(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  started_at text,
  finished_at text,
  total integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  unchanged_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  inactivated_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS xml_import_row_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES xml_import_runs(id) ON DELETE CASCADE,
  row_no integer,
  external_id text,
  message text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  is_active text NOT NULL DEFAULT 'true',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_uidx ON admin_users (email);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_token_uidx ON admin_sessions (token_hash);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS roles_key_uidx ON roles (key);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS permissions_key_uidx ON permissions (key);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (admin_user_id, role_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  entity text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
