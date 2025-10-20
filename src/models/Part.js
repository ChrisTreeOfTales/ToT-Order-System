/**
 * Part Model
 *
 * Handles all database operations for parts (standalone printable items).
 * Parts are individual items like "16mm Wound Marker" or "Token Box Lid".
 *
 * Operations:
 * - getAll() - Get all active parts
 * - getById(id) - Get a specific part
 * - create(data) - Add a new part
 * - update(id, data) - Update an existing part
 * - deactivate(id) - Soft delete a part (sets is_active = 0)
 * - activate(id) - Reactivate a deactivated part
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
 * Get all active parts
 * @param {boolean} includeInactive - Include deactivated parts (default: false)
 * @returns {Array} Array of part objects
 */
function getAll(includeInactive = false) {
  const query = includeInactive
    ? 'SELECT * FROM parts ORDER BY part_name ASC'
    : 'SELECT * FROM parts WHERE is_active = 1 ORDER BY part_name ASC';

  return db.prepare(query).all();
}

/**
 * Get a specific part by ID
 * @param {number} partId - The part ID
 * @returns {Object|null} Part object or null if not found
 */
function getById(partId) {
  return db.prepare('SELECT * FROM parts WHERE part_id = ?').get(partId);
}

/**
 * Get a specific part by part code (SKU)
 * @param {string} partCode - The part code (e.g., "WM16001")
 * @returns {Object|null} Part object or null if not found
 */
function getByCode(partCode) {
  return db.prepare('SELECT * FROM parts WHERE part_code = ?').get(partCode);
}

/**
 * Create a new part
 * @param {Object} partData - Part information
 * @param {string} partData.part_code - Unique part code/SKU (e.g., "WM16001")
 * @param {string} partData.part_name - Name of the part
 * @param {string} partData.description - Optional description
 * @returns {Object} The created part with its new ID
 */
function create(partData) {
  const stmt = db.prepare(`
    INSERT INTO parts (
      part_code,
      part_name,
      description,
      is_active
    ) VALUES (?, ?, ?, 1)
  `);

  const result = stmt.run(
    partData.part_code,
    partData.part_name,
    partData.description || null
  );

  return getById(result.lastInsertRowid);
}

/**
 * Update an existing part
 * @param {number} partId - The part ID to update
 * @param {Object} partData - Updated part information (same as create)
 * @returns {Object|null} Updated part or null if not found
 */
function update(partId, partData) {
  const stmt = db.prepare(`
    UPDATE parts
    SET part_code = ?,
        part_name = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE part_id = ?
  `);

  const result = stmt.run(
    partData.part_code,
    partData.part_name,
    partData.description || null,
    partId
  );

  return result.changes > 0 ? getById(partId) : null;
}

/**
 * Deactivate a part (soft delete)
 * We never actually delete parts to maintain data integrity.
 * @param {number} partId - The part ID to deactivate
 * @returns {boolean} True if successful
 */
function deactivate(partId) {
  const stmt = db.prepare('UPDATE parts SET is_active = 0 WHERE part_id = ?');
  const result = stmt.run(partId);
  return result.changes > 0;
}

/**
 * Reactivate a previously deactivated part
 * @param {number} partId - The part ID to activate
 * @returns {boolean} True if successful
 */
function activate(partId) {
  const stmt = db.prepare('UPDATE parts SET is_active = 1 WHERE part_id = ?');
  const result = stmt.run(partId);
  return result.changes > 0;
}

/**
 * Search parts by name or code
 * @param {string} searchTerm - Search term
 * @returns {Array} Array of matching parts
 */
function search(searchTerm) {
  return db.prepare(`
    SELECT * FROM parts
    WHERE (part_name LIKE ? OR part_code LIKE ?) AND is_active = 1
    ORDER BY part_name ASC
  `).all(`%${searchTerm}%`, `%${searchTerm}%`);
}

module.exports = {
  getAll,
  getById,
  getByCode,
  create,
  update,
  deactivate,
  activate,
  search
};
