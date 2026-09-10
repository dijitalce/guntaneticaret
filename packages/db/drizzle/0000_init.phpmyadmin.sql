CREATE TABLE `tenant_bank_accounts` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`bank_name` varchar(255) NOT NULL,
	`account_holder` varchar(255) NOT NULL,
	`iban` varchar(64) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_bank_accounts_id` PRIMARY KEY(`id`)
);
CREATE TABLE `tenant_catalog_rules` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`kind` varchar(64) NOT NULL,
	`target_id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_catalog_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_catalog_rules_uidx` UNIQUE(`tenant_id`,`kind`,`target_id`)
);
CREATE TABLE `tenant_domains` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`hostname` varchar(255) NOT NULL,
	`is_primary` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_domains_hostname_uidx` UNIQUE(`hostname`)
);
CREATE TABLE `tenant_settings` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`site_name` varchar(255) NOT NULL,
	`logo_url` text,
	`logo_dark_url` text,
	`favicon_url` text,
	`placeholder_image_url` text,
	`phone` varchar(64),
	`whatsapp` varchar(64),
	`email` varchar(255),
	`address` text,
	`social_json` json DEFAULT ('{}'),
	`theme_tokens` json NOT NULL DEFAULT ('{}'),
	`default_meta_title` varchar(255),
	`default_meta_description` text,
	`og_image_url` text,
	`ga_id` varchar(64),
	`gtm_id` varchar(64),
	`custom_scripts` text,
	`header_html` text,
	`footer_html` text,
	`min_order_amount` int NOT NULL DEFAULT 0,
	`payment_expire_hours` int NOT NULL DEFAULT 72,
	`seo_title_template` varchar(255) DEFAULT '{page} | {siteName}',
	`seo_content` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_settings_tenant_uidx` UNIQUE(`tenant_id`)
);
CREATE TABLE `tenants` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`visibility_mode` varchar(32) NOT NULL DEFAULT 'ALL',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_uidx` UNIQUE(`slug`)
);
CREATE TABLE `brand_group_members` (
	`group_id` char(36) NOT NULL,
	`brand_id` char(36) NOT NULL,
	CONSTRAINT `brand_group_members_group_id_brand_id_pk` PRIMARY KEY(`group_id`,`brand_id`)
);
CREATE TABLE `brand_groups` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `brand_groups_slug_uidx` UNIQUE(`slug`)
);
CREATE TABLE `categories` (
	`id` char(36) NOT NULL,
	`parent_id` char(36),
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`path` varchar(512) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`seo_content` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_path_uidx` UNIQUE(`path`)
);
CREATE TABLE `manufacturers` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`logo_url` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manufacturers_id` PRIMARY KEY(`id`),
	CONSTRAINT `manufacturers_slug_uidx` UNIQUE(`slug`)
);
CREATE TABLE `product_categories` (
	`product_id` char(36) NOT NULL,
	`category_id` char(36) NOT NULL,
	CONSTRAINT `product_categories_product_id_category_id_pk` PRIMARY KEY(`product_id`,`category_id`)
);
CREATE TABLE `product_fitments` (
	`id` char(36) NOT NULL,
	`product_id` char(36) NOT NULL,
	`vehicle_brand_id` char(36) NOT NULL,
	`vehicle_model_id` char(36) NOT NULL,
	`vehicle_generation_id` char(36),
	`vehicle_engine_id` char(36),
	`year_from` int,
	`year_to` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_fitments_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_fitments_uidx` UNIQUE(`product_id`,`vehicle_model_id`,`vehicle_generation_id`,`vehicle_engine_id`)
);
CREATE TABLE `product_images` (
	`id` char(36) NOT NULL,
	`product_id` char(36) NOT NULL,
	`s3_key` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`alt` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_images_id` PRIMARY KEY(`id`)
);
CREATE TABLE `product_oems` (
	`id` char(36) NOT NULL,
	`product_id` char(36) NOT NULL,
	`raw` varchar(191) NOT NULL,
	`normalized` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_oems_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_oems_product_norm_uidx` UNIQUE(`product_id`,`normalized`)
);
CREATE TABLE `products` (
	`id` char(36) NOT NULL,
	`supplier_id` char(36) NOT NULL,
	`manufacturer_id` char(36),
	`sku` varchar(191) NOT NULL,
	`external_id` varchar(191) NOT NULL,
	`name` varchar(512) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`description` text,
	`barcode` varchar(64),
	`price` decimal(12,2) NOT NULL,
	`compare_at_price` decimal(12,2),
	`vat_rate` decimal(5,2) NOT NULL DEFAULT '20',
	`stock_qty` int NOT NULL DEFAULT 0,
	`reserved_qty` int NOT NULL DEFAULT 0,
	`stock_status` varchar(32) NOT NULL DEFAULT 'in_stock',
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`content_hash` varchar(64),
	`source` varchar(32) NOT NULL DEFAULT 'manual',
	`published_at` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_supplier_external_uidx` UNIQUE(`supplier_id`,`external_id`),
	CONSTRAINT `products_slug_uidx` UNIQUE(`slug`)
);
CREATE TABLE `suppliers` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_code_uidx` UNIQUE(`code`)
);
CREATE TABLE `tenant_catalog_index` (
	`tenant_id` char(36) NOT NULL,
	`product_id` char(36) NOT NULL,
	CONSTRAINT `tenant_catalog_index_tenant_id_product_id_pk` PRIMARY KEY(`tenant_id`,`product_id`)
);
CREATE TABLE `tenant_product_overrides` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`product_id` char(36) NOT NULL,
	`price` decimal(12,2),
	`compare_at_price` decimal(12,2),
	`min_qty` int,
	`is_hidden` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_product_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_product_overrides_uidx` UNIQUE(`tenant_id`,`product_id`)
);
CREATE TABLE `tenant_visible_brands` (
	`tenant_id` char(36) NOT NULL,
	`brand_id` char(36) NOT NULL,
	CONSTRAINT `tenant_visible_brands_tenant_id_brand_id_pk` PRIMARY KEY(`tenant_id`,`brand_id`)
);
CREATE TABLE `vehicle_brands` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`logo_url` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`seo_content` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicle_brands_slug_uidx` UNIQUE(`slug`)
);
CREATE TABLE `vehicle_engines` (
	`id` char(36) NOT NULL,
	`generation_id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`fuel` varchar(64),
	`displacement_cc` int,
	`power_hp` int,
	`code` varchar(64),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_engines_id` PRIMARY KEY(`id`)
);
CREATE TABLE `vehicle_generations` (
	`id` char(36) NOT NULL,
	`model_id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`body_code` varchar(64),
	`year_from` int,
	`year_to` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_generations_id` PRIMARY KEY(`id`)
);
CREATE TABLE `vehicle_models` (
	`id` char(36) NOT NULL,
	`brand_id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`image_url` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`seo_content` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_models_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicle_models_brand_slug_uidx` UNIQUE(`brand_id`,`slug`)
);
CREATE TABLE `cart_items` (
	`id` char(36) NOT NULL,
	`cart_id` char(36) NOT NULL,
	`product_id` char(36) NOT NULL,
	`qty` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_items_cart_product_uidx` UNIQUE(`cart_id`,`product_id`)
);
CREATE TABLE `carts` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`customer_id` char(36),
	`session_id` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carts_id` PRIMARY KEY(`id`)
);
CREATE TABLE `coupons` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`type` varchar(32) NOT NULL DEFAULT 'percent',
	`value` decimal(12,2) NOT NULL,
	`min_subtotal` decimal(12,2),
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_tenant_code_uidx` UNIQUE(`tenant_id`,`code`)
);
CREATE TABLE `customer_addresses` (
	`id` char(36) NOT NULL,
	`customer_id` char(36) NOT NULL,
	`title` varchar(128) NOT NULL DEFAULT 'Adres',
	`full_name` varchar(255) NOT NULL,
	`phone` varchar(64) NOT NULL,
	`city` varchar(128) NOT NULL,
	`district` varchar(128) NOT NULL,
	`line1` text NOT NULL,
	`line2` text,
	`postal_code` varchar(32),
	`is_default` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_addresses_id` PRIMARY KEY(`id`)
);
CREATE TABLE `customer_sessions` (
	`id` char(36) NOT NULL,
	`customer_id` char(36) NOT NULL,
	`token_hash` varchar(128) NOT NULL,
	`expires_at` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_sessions_token_uidx` UNIQUE(`token_hash`)
);
CREATE TABLE `customer_vehicles` (
	`id` char(36) NOT NULL,
	`customer_id` char(36) NOT NULL,
	`brand_id` char(36) NOT NULL,
	`model_id` char(36) NOT NULL,
	`generation_id` char(36),
	`engine_id` char(36),
	`year` int,
	`label` varchar(255),
	`is_selected` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_vehicles_id` PRIMARY KEY(`id`)
);
CREATE TABLE `customers` (
	`id` char(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`first_name` varchar(128) NOT NULL,
	`last_name` varchar(128) NOT NULL,
	`phone` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_email_uidx` UNIQUE(`email`)
);
CREATE TABLE `order_items` (
	`id` char(36) NOT NULL,
	`order_id` char(36) NOT NULL,
	`product_id` char(36) NOT NULL,
	`name` varchar(512) NOT NULL,
	`sku` varchar(191) NOT NULL,
	`image_url` text,
	`qty` int NOT NULL,
	`unit_price` decimal(12,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
CREATE TABLE `orders` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`customer_id` char(36),
	`order_no` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending_payment',
	`email` varchar(255) NOT NULL,
	`phone` varchar(64) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`shipping_address` json NOT NULL,
	`subtotal` decimal(12,2) NOT NULL,
	`shipping_total` decimal(12,2) NOT NULL DEFAULT '0',
	`discount_total` decimal(12,2) NOT NULL DEFAULT '0',
	`grand_total` decimal(12,2) NOT NULL,
	`coupon_code` varchar(64),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_no_uidx` UNIQUE(`order_no`)
);
CREATE TABLE `payments` (
	`id` char(36) NOT NULL,
	`order_id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`method` varchar(32) NOT NULL DEFAULT 'bank_transfer',
	`status` varchar(32) NOT NULL DEFAULT 'awaiting',
	`amount` decimal(12,2) NOT NULL,
	`provider_ref` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
CREATE TABLE `return_requests` (
	`id` char(36) NOT NULL,
	`order_id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`reason` text NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `return_requests_id` PRIMARY KEY(`id`)
);
CREATE TABLE `shipments` (
	`id` char(36) NOT NULL,
	`order_id` char(36) NOT NULL,
	`carrier` varchar(128),
	`tracking_no` varchar(128),
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`)
);
CREATE TABLE `wishlists` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`customer_id` char(36),
	`session_id` varchar(128),
	`product_id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`)
);
CREATE TABLE `banners` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`image_url` text NOT NULL,
	`href` varchar(512),
	`placement` varchar(64) NOT NULL DEFAULT 'home',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);
CREATE TABLE `blog_posts` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`excerpt` text,
	`body` text NOT NULL DEFAULT (''),
	`is_published` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_tenant_slug_uidx` UNIQUE(`tenant_id`,`slug`)
);
CREATE TABLE `faqs` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
CREATE TABLE `homepage_sections` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`key` varchar(64) NOT NULL,
	`title` varchar(255),
	`config` json DEFAULT ('{}'),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `homepage_sections_id` PRIMARY KEY(`id`),
	CONSTRAINT `homepage_sections_tenant_key_uidx` UNIQUE(`tenant_id`,`key`)
);
CREATE TABLE `menu_items` (
	`id` char(36) NOT NULL,
	`menu_id` char(36) NOT NULL,
	`label` varchar(255) NOT NULL,
	`href` varchar(512) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
CREATE TABLE `menus` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`key` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menus_id` PRIMARY KEY(`id`),
	CONSTRAINT `menus_tenant_key_uidx` UNIQUE(`tenant_id`,`key`)
);
CREATE TABLE `pages` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`body` text NOT NULL DEFAULT (''),
	`meta_title` varchar(255),
	`meta_description` text,
	`is_published` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_tenant_slug_uidx` UNIQUE(`tenant_id`,`slug`)
);
CREATE TABLE `redirects` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36),
	`old_path` varchar(512) NOT NULL,
	`new_path` varchar(512) NOT NULL,
	`status_code` int NOT NULL DEFAULT 301,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `redirects_id` PRIMARY KEY(`id`)
);
CREATE TABLE `xml_feeds` (
	`id` char(36) NOT NULL,
	`supplier_id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text,
	`file_path` text,
	`mapping` json NOT NULL DEFAULT ('{}'),
	`schedule_cron` varchar(64),
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `xml_feeds_id` PRIMARY KEY(`id`),
	CONSTRAINT `xml_feeds_name_uidx` UNIQUE(`name`)
);
CREATE TABLE `xml_import_row_errors` (
	`id` char(36) NOT NULL,
	`run_id` char(36) NOT NULL,
	`row_no` int,
	`external_id` varchar(191),
	`message` text NOT NULL,
	`payload` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `xml_import_row_errors_id` PRIMARY KEY(`id`)
);
CREATE TABLE `xml_import_runs` (
	`id` char(36) NOT NULL,
	`feed_id` char(36) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'queued',
	`started_at` varchar(64),
	`finished_at` varchar(64),
	`total` int NOT NULL DEFAULT 0,
	`created_count` int NOT NULL DEFAULT 0,
	`updated_count` int NOT NULL DEFAULT 0,
	`unchanged_count` int NOT NULL DEFAULT 0,
	`failed_count` int NOT NULL DEFAULT 0,
	`inactivated_count` int NOT NULL DEFAULT 0,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `xml_import_runs_id` PRIMARY KEY(`id`)
);
CREATE TABLE `admin_sessions` (
	`id` char(36) NOT NULL,
	`admin_user_id` char(36) NOT NULL,
	`token_hash` varchar(128) NOT NULL,
	`expires_at` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_sessions_token_uidx` UNIQUE(`token_hash`)
);
CREATE TABLE `admin_user_roles` (
	`admin_user_id` char(36) NOT NULL,
	`role_id` char(36) NOT NULL,
	CONSTRAINT `admin_user_roles_admin_user_id_role_id_pk` PRIMARY KEY(`admin_user_id`,`role_id`)
);
CREATE TABLE `admin_users` (
	`id` char(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`is_active` varchar(16) NOT NULL DEFAULT 'true',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_uidx` UNIQUE(`email`)
);
CREATE TABLE `audit_logs` (
	`id` char(36) NOT NULL,
	`actor_id` char(36),
	`actor_email` varchar(255),
	`entity` varchar(128) NOT NULL,
	`entity_id` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`before` json,
	`after` json,
	`ip` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
CREATE TABLE `permissions` (
	`id` char(36) NOT NULL,
	`key` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_key_uidx` UNIQUE(`key`)
);
CREATE TABLE `role_permissions` (
	`role_id` char(36) NOT NULL,
	`permission_id` char(36) NOT NULL,
	CONSTRAINT `role_permissions_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);
CREATE TABLE `roles` (
	`id` char(36) NOT NULL,
	`key` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_key_uidx` UNIQUE(`key`)
);
ALTER TABLE `tenant_bank_accounts` ADD CONSTRAINT `tenant_bank_accounts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tenant_catalog_rules` ADD CONSTRAINT `tenant_catalog_rules_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tenant_domains` ADD CONSTRAINT `tenant_domains_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tenant_settings` ADD CONSTRAINT `tenant_settings_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `brand_group_members` ADD CONSTRAINT `brand_group_members_group_id_brand_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `brand_groups`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `brand_group_members` ADD CONSTRAINT `brand_group_members_brand_id_vehicle_brands_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `vehicle_brands`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `product_fitments` ADD CONSTRAINT `product_fitments_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `product_fitments` ADD CONSTRAINT `product_fitments_vehicle_brand_id_vehicle_brands_id_fk` FOREIGN KEY (`vehicle_brand_id`) REFERENCES `vehicle_brands`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `product_fitments` ADD CONSTRAINT `product_fitments_vehicle_model_id_vehicle_models_id_fk` FOREIGN KEY (`vehicle_model_id`) REFERENCES `vehicle_models`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `product_fitments` ADD CONSTRAINT `product_fitments_vehicle_generation_id_vehicle_generations_id_fk` FOREIGN KEY (`vehicle_generation_id`) REFERENCES `vehicle_generations`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `product_fitments` ADD CONSTRAINT `product_fitments_vehicle_engine_id_vehicle_engines_id_fk` FOREIGN KEY (`vehicle_engine_id`) REFERENCES `vehicle_engines`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `product_oems` ADD CONSTRAINT `product_oems_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `products` ADD CONSTRAINT `products_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `products` ADD CONSTRAINT `products_manufacturer_id_manufacturers_id_fk` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `tenant_catalog_index` ADD CONSTRAINT `tenant_catalog_index_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tenant_catalog_index` ADD CONSTRAINT `tenant_catalog_index_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tenant_product_overrides` ADD CONSTRAINT `tenant_product_overrides_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tenant_product_overrides` ADD CONSTRAINT `tenant_product_overrides_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tenant_visible_brands` ADD CONSTRAINT `tenant_visible_brands_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tenant_visible_brands` ADD CONSTRAINT `tenant_visible_brands_brand_id_vehicle_brands_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `vehicle_brands`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `vehicle_engines` ADD CONSTRAINT `vehicle_engines_generation_id_vehicle_generations_id_fk` FOREIGN KEY (`generation_id`) REFERENCES `vehicle_generations`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `vehicle_generations` ADD CONSTRAINT `vehicle_generations_model_id_vehicle_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `vehicle_models`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `vehicle_models` ADD CONSTRAINT `vehicle_models_brand_id_vehicle_brands_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `vehicle_brands`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `carts` ADD CONSTRAINT `carts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `carts` ADD CONSTRAINT `carts_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `customer_addresses` ADD CONSTRAINT `customer_addresses_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `customer_sessions` ADD CONSTRAINT `customer_sessions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `customer_vehicles` ADD CONSTRAINT `customer_vehicles_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `orders` ADD CONSTRAINT `orders_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `payments` ADD CONSTRAINT `payments_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `return_requests` ADD CONSTRAINT `return_requests_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `return_requests` ADD CONSTRAINT `return_requests_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `banners` ADD CONSTRAINT `banners_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `faqs` ADD CONSTRAINT `faqs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `homepage_sections` ADD CONSTRAINT `homepage_sections_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_menu_id_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `menus` ADD CONSTRAINT `menus_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `pages` ADD CONSTRAINT `pages_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `redirects` ADD CONSTRAINT `redirects_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `xml_feeds` ADD CONSTRAINT `xml_feeds_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `xml_import_row_errors` ADD CONSTRAINT `xml_import_row_errors_run_id_xml_import_runs_id_fk` FOREIGN KEY (`run_id`) REFERENCES `xml_import_runs`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `xml_import_runs` ADD CONSTRAINT `xml_import_runs_feed_id_xml_feeds_id_fk` FOREIGN KEY (`feed_id`) REFERENCES `xml_feeds`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_admin_user_id_admin_users_id_fk` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `admin_user_roles` ADD CONSTRAINT `admin_user_roles_admin_user_id_admin_users_id_fk` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `admin_user_roles` ADD CONSTRAINT `admin_user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;
CREATE INDEX `tenant_bank_accounts_tenant_idx` ON `tenant_bank_accounts` (`tenant_id`);
CREATE INDEX `tenant_catalog_rules_tenant_idx` ON `tenant_catalog_rules` (`tenant_id`);
CREATE INDEX `tenant_domains_tenant_idx` ON `tenant_domains` (`tenant_id`);
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);
CREATE INDEX `product_categories_category_idx` ON `product_categories` (`category_id`);
CREATE INDEX `product_fitments_brand_model_idx` ON `product_fitments` (`vehicle_brand_id`,`vehicle_model_id`);
CREATE INDEX `product_fitments_brand_product_idx` ON `product_fitments` (`vehicle_brand_id`,`product_id`);
CREATE INDEX `product_fitments_model_product_idx` ON `product_fitments` (`vehicle_model_id`,`product_id`);
CREATE INDEX `product_fitments_engine_idx` ON `product_fitments` (`vehicle_engine_id`);
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`,`sort_order`);
CREATE INDEX `product_oems_normalized_idx` ON `product_oems` (`normalized`);
CREATE INDEX `products_status_idx` ON `products` (`status`);
CREATE INDEX `products_sku_idx` ON `products` (`sku`);
CREATE INDEX `products_active_stock_idx` ON `products` (`status`,`stock_qty` desc,`updated_at` desc);
CREATE INDEX `products_manufacturer_active_idx` ON `products` (`status`,`manufacturer_id`);
CREATE INDEX `products_price_active_idx` ON `products` (`status`,`price`);
CREATE INDEX `products_name_prefix_idx` ON `products` (`name`);
CREATE INDEX `products_sku_prefix_idx` ON `products` (`sku`);
CREATE INDEX `tenant_catalog_index_product_idx` ON `tenant_catalog_index` (`product_id`);
CREATE INDEX `vehicle_engines_generation_idx` ON `vehicle_engines` (`generation_id`);
CREATE INDEX `vehicle_generations_model_idx` ON `vehicle_generations` (`model_id`);
CREATE INDEX `vehicle_models_brand_idx` ON `vehicle_models` (`brand_id`);
CREATE INDEX `cart_items_product_idx` ON `cart_items` (`product_id`);
CREATE INDEX `carts_tenant_customer_idx` ON `carts` (`tenant_id`,`customer_id`);
CREATE INDEX `carts_tenant_session_idx` ON `carts` (`tenant_id`,`session_id`);
CREATE INDEX `customer_addresses_customer_idx` ON `customer_addresses` (`customer_id`);
CREATE INDEX `customer_sessions_customer_idx` ON `customer_sessions` (`customer_id`);
CREATE INDEX `customer_vehicles_customer_idx` ON `customer_vehicles` (`customer_id`);
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);
CREATE INDEX `order_items_product_idx` ON `order_items` (`product_id`);
CREATE INDEX `orders_tenant_idx` ON `orders` (`tenant_id`);
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);
CREATE INDEX `orders_status_idx` ON `orders` (`status`);
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);
CREATE INDEX `payments_tenant_idx` ON `payments` (`tenant_id`);
CREATE INDEX `return_requests_order_idx` ON `return_requests` (`order_id`);
CREATE INDEX `shipments_order_idx` ON `shipments` (`order_id`);
CREATE INDEX `wishlists_tenant_customer_idx` ON `wishlists` (`tenant_id`,`customer_id`);
CREATE INDEX `banners_tenant_idx` ON `banners` (`tenant_id`);
CREATE INDEX `menu_items_menu_idx` ON `menu_items` (`menu_id`);
CREATE INDEX `redirects_old_path_idx` ON `redirects` (`old_path`);
CREATE INDEX `xml_import_row_errors_run_idx` ON `xml_import_row_errors` (`run_id`);
CREATE INDEX `xml_import_runs_feed_idx` ON `xml_import_runs` (`feed_id`);
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity`,`entity_id`);
