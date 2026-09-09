-- Hot-path indexes only. Avoid extra btree copies of columns already covered
-- by unique indexes (fitments product_id, catalog PK).

CREATE INDEX IF NOT EXISTS products_active_stock_idx
  ON products (stock_qty DESC, updated_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS product_categories_category_idx
  ON product_categories (category_id);

CREATE INDEX IF NOT EXISTS product_images_product_idx
  ON product_images (product_id, sort_order);
