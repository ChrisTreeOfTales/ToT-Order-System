-- ============================================================================
-- PRODUCT TEMPLATES TABLE
-- Reusable product definitions that can be used across multiple orders
-- Each template defines what parts make up a product, how many colors, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_templates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL UNIQUE,
  description TEXT,
  num_colors INTEGER NOT NULL DEFAULT 1 CHECK(num_colors BETWEEN 1 AND 4),
  print_time_minutes INTEGER NOT NULL DEFAULT 0,
  print_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_templates_active ON product_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_product_templates_name ON product_templates(template_name);

-- ============================================================================
-- TEMPLATE_PARTS TABLE (Junction Table)
-- Links product templates to their constituent parts
-- quantity allows for parts to be used multiple times (e.g., 4 lids)
-- ============================================================================
CREATE TABLE IF NOT EXISTS template_parts (
  template_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (template_id, part_id),
  FOREIGN KEY (template_id) REFERENCES product_templates(template_id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES parts(part_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_parts_template ON template_parts(template_id);
CREATE INDEX IF NOT EXISTS idx_template_parts_part ON template_parts(part_id);
