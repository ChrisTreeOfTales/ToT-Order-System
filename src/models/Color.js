/**
 * Color Model
 *
 * Handles all database operations for colors (materials).
 * Colors are used for tracking different filament types and suppliers.
 *
 * Operations:
 * - getAll() - Get all active colors
 * - getById(id) - Get a specific color
 * - create(data) - Add a new color
 * - update(id, data) - Update an existing color
 * - deactivate(id) - Soft delete a color (sets is_active = 0)
 * - activate(id) - Reactivate a deactivated color
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database connection
const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/data/printfarm.db'
  : path.join(__dirname, '../../printfarm.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

/**
 * Get all active colors
 * @param {boolean} includeInactive - Include deactivated colors (default: false)
 * @returns {Array} Array of color objects
 */
function getAll(includeInactive = false) {
  const query = includeInactive
    ? 'SELECT * FROM colors ORDER BY color_name ASC'
    : 'SELECT * FROM colors WHERE is_active = 1 ORDER BY color_name ASC';

  return db.prepare(query).all();
}

/**
 * Get a specific color by ID
 * @param {number} colorId - The color ID
 * @returns {Object|null} Color object or null if not found
 */
function getById(colorId) {
  return db.prepare('SELECT * FROM colors WHERE color_id = ?').get(colorId);
}

/**
 * Create a new color
 * @param {Object} colorData - Color information
 * @param {string} colorData.color_name - Name of the color
 * @param {string} colorData.hex_code - Hex color code (e.g., #FF0000)
 * @param {string} colorData.pantone_code - Optional Pantone code
 * @param {string} colorData.material_type - Material type (PLA, PETG, ABS, etc.)
 * @param {string} colorData.supplier - Supplier name (Bambu Lab, etc.)
 * @param {string} colorData.category - Category (Basic, Matte, Silk, etc.)
 * @param {number} colorData.cost_per_gram - Cost per gram
 * @param {number} colorData.stock_grams - Current stock in grams
 * @returns {Object} The created color with its new ID
 */
function create(colorData) {
  const stmt = db.prepare(`
    INSERT INTO colors (
      color_name,
      hex_code,
      pantone_code,
      material_type,
      supplier,
      category,
      cost_per_gram,
      stock_grams,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const result = stmt.run(
    colorData.color_name,
    colorData.hex_code,
    colorData.pantone_code || null,
    colorData.material_type || null,
    colorData.supplier || null,
    colorData.category || null,
    colorData.cost_per_gram || 0,
    colorData.stock_grams || 0
  );

  return getById(result.lastInsertRowid);
}

/**
 * Update an existing color
 * @param {number} colorId - The color ID to update
 * @param {Object} colorData - Updated color information (same as create)
 * @returns {Object|null} Updated color or null if not found
 */
function update(colorId, colorData) {
  const stmt = db.prepare(`
    UPDATE colors
    SET color_name = ?,
        hex_code = ?,
        pantone_code = ?,
        material_type = ?,
        supplier = ?,
        category = ?,
        cost_per_gram = ?,
        stock_grams = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE color_id = ?
  `);

  const result = stmt.run(
    colorData.color_name,
    colorData.hex_code,
    colorData.pantone_code || null,
    colorData.material_type || null,
    colorData.supplier || null,
    colorData.category || null,
    colorData.cost_per_gram || 0,
    colorData.stock_grams || 0,
    colorId
  );

  return result.changes > 0 ? getById(colorId) : null;
}

/**
 * Deactivate a color (soft delete)
 * We never actually delete colors to maintain data integrity.
 * @param {number} colorId - The color ID to deactivate
 * @returns {boolean} True if successful
 */
function deactivate(colorId) {
  const stmt = db.prepare('UPDATE colors SET is_active = 0 WHERE color_id = ?');
  const result = stmt.run(colorId);
  return result.changes > 0;
}

/**
 * Reactivate a previously deactivated color
 * @param {number} colorId - The color ID to activate
 * @returns {boolean} True if successful
 */
function activate(colorId) {
  const stmt = db.prepare('UPDATE colors SET is_active = 1 WHERE color_id = ?');
  const result = stmt.run(colorId);
  return result.changes > 0;
}

/**
 * Search colors by name
 * @param {string} searchTerm - Search term
 * @returns {Array} Array of matching colors
 */
function search(searchTerm) {
  return db.prepare(`
    SELECT * FROM colors
    WHERE color_name LIKE ? AND is_active = 1
    ORDER BY color_name ASC
  `).all(`%${searchTerm}%`);
}

/**
 * Get colors by supplier
 * @param {string} supplier - Supplier name
 * @returns {Array} Array of colors from that supplier
 */
function getBySupplier(supplier) {
  return db.prepare(`
    SELECT * FROM colors
    WHERE supplier = ? AND is_active = 1
    ORDER BY color_name ASC
  `).get(supplier);
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  deactivate,
  activate,
  search,
  getBySupplier
};
