-- Listing starts from fitments; these let DISTINCT product_id stay index-only.
CREATE INDEX IF NOT EXISTS product_fitments_brand_product_idx
  ON product_fitments (vehicle_brand_id, product_id);

CREATE INDEX IF NOT EXISTS product_fitments_model_product_idx
  ON product_fitments (vehicle_model_id, product_id);
