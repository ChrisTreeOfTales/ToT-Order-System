-- Database Schema for ToT Print Farm Management System
-- This file defines the structure of all database tables
-- SQLite database with Write-Ahead Logging (WAL) for better concurrent access

-- ============================================================================
-- COLORS TABLE
-- Stores all available colors for printing items
-- Enhanced with material information from ZEUS database
-- Never delete colors (soft delete with is_active flag)
-- ============================================================================
CREATE TABLE IF NOT EXISTS colors (
  color_id INTEGER PRIMARY KEY AUTOINCREMENT,
  color_name TEXT NOT NULL UNIQUE,
  hex_code TEXT NOT NULL,
  pantone_code TEXT,
  material_type TEXT,              -- PLA, PETG, ABS, etc.
  supplier TEXT,                   -- Bambu Lab, PolyTerra, etc.
  category TEXT,                   -- Basic, Matte, Silk, etc.
  cost_per_gram DECIMAL(8,4),      -- Cost per gram for inventory
  stock_grams DECIMAL(10,2) DEFAULT 0,  -- Current stock in grams
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups of active colors
CREATE INDEX IF NOT EXISTS idx_colors_active ON colors(is_active);
CREATE INDEX IF NOT EXISTS idx_colors_supplier ON colors(supplier);
CREATE INDEX IF NOT EXISTS idx_colors_material ON colors(material_type);

-- ============================================================================
-- PARTS TABLE
-- Master list of all parts that can be included in items
-- Enhanced with part_code from ZEUS database for SKU tracking
-- Never delete parts (soft delete with is_active flag)
-- ============================================================================
CREATE TABLE IF NOT EXISTS parts (
  part_id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_code TEXT UNIQUE,           -- SKU/Part code (e.g., WM16001, TOK0025)
  part_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups of active parts
CREATE INDEX IF NOT EXISTS idx_parts_active ON parts(is_active);
CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(part_code);

-- ============================================================================
-- ORDERS TABLE
-- Main orders table - one order can contain multiple products
-- Order numbers are auto-generated but editable
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  order_id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('Shopify', 'Etsy', 'Custom Order')),
  order_notes TEXT,
  ship_by_date DATE NOT NULL,
  is_express BOOLEAN DEFAULT 0,
  is_archived BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  shipped_at DATETIME
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(is_archived);
CREATE INDEX IF NOT EXISTS idx_orders_express ON orders(is_express);
CREATE INDEX IF NOT EXISTS idx_orders_ship_by_date ON orders(ship_by_date);
CREATE INDEX IF NOT EXISTS idx_orders_platform ON orders(platform);

-- ============================================================================
-- PRODUCTS TABLE
-- One order can have multiple products
-- Each product can have multiple items (printing plates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- Index for faster lookups by order
CREATE INDEX IF NOT EXISTS idx_products_order ON products(order_id);

-- ============================================================================
-- ITEMS TABLE
-- Represents individual printing plates
-- Each item has a status that drives the workflow
-- Status can only move forward (except for reprints)
-- ============================================================================
CREATE TABLE IF NOT EXISTS items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Queue'
    CHECK(status IN ('In Queue', 'In Printfarm', 'Printed', 'Assembled', 'Packed', 'Shipped')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- Indexes for filtering by status (most common query)
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_product ON items(product_id);
CREATE INDEX IF NOT EXISTS idx_items_updated ON items(updated_at DESC);

-- ============================================================================
-- ITEM_COLORS TABLE (Junction Table)
-- Links items to their colors (1-4 colors per item)
-- color_order defines the sequence of colors (important for visual identification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_colors (
  item_id INTEGER NOT NULL,
  color_id INTEGER NOT NULL,
  color_order INTEGER NOT NULL,
  PRIMARY KEY (item_id, color_id),
  FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
  FOREIGN KEY (color_id) REFERENCES colors(color_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_colors_item ON item_colors(item_id);
CREATE INDEX IF NOT EXISTS idx_item_colors_order ON item_colors(item_id, color_order);

-- ============================================================================
-- ITEM_PARTS TABLE (Junction Table)
-- Links items to their constituent parts
-- needs_reprint flag marks individual parts for reprinting
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_parts (
  item_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  needs_reprint BOOLEAN DEFAULT 0,
  PRIMARY KEY (item_id, part_id),
  FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES parts(part_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_parts_item ON item_parts(item_id);
CREATE INDEX IF NOT EXISTS idx_item_parts_reprint ON item_parts(needs_reprint);

-- ============================================================================
-- STATUS_HISTORY TABLE (Audit Log)
-- Tracks every status change for auditing and debugging
-- Critical for understanding workflow issues
-- ============================================================================
CREATE TABLE IF NOT EXISTS status_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
);

-- Index for faster lookups by item
CREATE INDEX IF NOT EXISTS idx_status_history_item ON status_history(item_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON status_history(changed_at DESC);

-- ============================================================================
-- SYSTEM_SETTINGS TABLE (Future Use)
-- Stores system-wide configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DATABASE TRIGGERS
-- Automatically update 'updated_at' timestamps when records change
-- ============================================================================

-- Trigger for orders table
CREATE TRIGGER IF NOT EXISTS update_orders_timestamp
AFTER UPDATE ON orders
BEGIN
  UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE order_id = NEW.order_id;
END;

-- Trigger for products table
CREATE TRIGGER IF NOT EXISTS update_products_timestamp
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE product_id = NEW.product_id;
END;

-- Trigger for items table
CREATE TRIGGER IF NOT EXISTS update_items_timestamp
AFTER UPDATE ON items
BEGIN
  UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE item_id = NEW.item_id;
END;

-- ============================================================================
-- HELPFUL VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Active orders with all details
CREATE VIEW IF NOT EXISTS view_active_orders AS
SELECT
  o.order_id,
  o.order_number,
  o.customer_name,
  o.platform,
  o.order_notes,
  o.ship_by_date,
  o.is_express,
  o.created_at,
  COUNT(DISTINCT p.product_id) as product_count,
  COUNT(DISTINCT i.item_id) as item_count
FROM orders o
LEFT JOIN products p ON o.order_id = p.order_id
LEFT JOIN items i ON p.product_id = i.product_id
WHERE o.is_archived = 0
GROUP BY o.order_id;

-- View: Items with their order and product context
CREATE VIEW IF NOT EXISTS view_items_full AS
SELECT
  i.item_id,
  i.item_name,
  i.status,
  i.created_at,
  i.updated_at,
  p.product_id,
  p.product_name,
  o.order_id,
  o.order_number,
  o.customer_name,
  o.platform,
  o.ship_by_date,
  o.is_express
FROM items i
JOIN products p ON i.product_id = p.product_id
JOIN orders o ON p.order_id = o.order_id
WHERE o.is_archived = 0;

-- ============================================================================
-- INITIAL SYSTEM SETTINGS
-- ============================================================================
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('order_number_prefix', '', 'Prefix for order numbers (e.g., "TOT-" results in "TOT-001")'),
('order_number_padding', '3', 'Number of digits to pad order numbers (3 = 001, 4 = 0001)'),
('backup_enabled', '1', 'Enable automatic backups (1 = yes, 0 = no)'),
('backup_interval_hours', '1', 'Hours between automatic backups'),
('app_version', '1.0.0', 'Current application version');
