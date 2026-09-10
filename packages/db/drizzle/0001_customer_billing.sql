-- Customer billing / invoice profile + address kind
-- Safe to re-run: ignores duplicate column errors when applied via ensure script.

ALTER TABLE `customers`
  ADD COLUMN `invoice_type` varchar(32) NOT NULL DEFAULT 'individual';
--> statement-breakpoint
ALTER TABLE `customers`
  ADD COLUMN `company_name` varchar(255);
--> statement-breakpoint
ALTER TABLE `customers`
  ADD COLUMN `tax_office` varchar(128);
--> statement-breakpoint
ALTER TABLE `customers`
  ADD COLUMN `tax_number` varchar(64);
--> statement-breakpoint
ALTER TABLE `customers`
  ADD COLUMN `national_id` varchar(32);
--> statement-breakpoint
ALTER TABLE `customer_addresses`
  ADD COLUMN `kind` varchar(32) NOT NULL DEFAULT 'shipping';
